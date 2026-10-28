import { createHash } from 'node:crypto'
import { chmod, readdir, readFile, rm, stat } from 'node:fs/promises'

import { basename, join } from 'pathe'

import { isTable } from './editors'
import { backupRelativePath, readTextIfExists, snapshotFile, writeFileAtomic } from './fs'

/** Why a run's files were copied: an apply, a config save, or the undo copy a restore makes first. */
export type BackupReason = 'apply' | 'save' | 'restore'

/** One backed-up file. `path` is where it sits under the run folder, mirroring its place under home. */
export interface BackupEntry {
  path: string
  /** Missing for runs from before manifests existed, whose entries `listBackups` derives by walking. */
  sha256?: string
  size: number
  mode: number
}

export interface BackupManifest {
  version: 1
  createdAt: string
  reason: BackupReason
  entries: BackupEntry[]
}

/** One run folder, as `listBackups` reports it. */
export interface BackupInfo {
  /** The run folder's name: the id `restoreBackup` and `pruneBackups` take. */
  id: string
  /** Missing for runs from before manifests existed. */
  createdAt?: string
  reason?: BackupReason
  entries: BackupEntry[]
}

/** What a restore did. Files go back one by one, each atomically; the restore is not
 * transactional, so one that stops partway leaves the files already written in place. */
export interface RestoreResult {
  /** The id of the run this restore copied the current files into, so it can be undone. */
  id: string
  /** Files whose content differed and were written back. */
  changed: number
  /** Files already holding the backed-up content; only their recorded mode goes back on. */
  unchanged: number
  /** Files that no longer existed and were brought back. */
  missing: number
}

/** The folder one backup run writes into, named by its time. */
export function backupRunDir(root: string, at: Date): string {
  return join(root, at.toISOString().replace(/[:.]/g, '-'))
}

/**
 * The backups of one run, all under one folder: each file copied at its home-relative
 * place, described together in a manifest that `finish` writes. Snapshots of the same
 * file collapse to the first, taken before its first change.
 */
export class BackupRun {
  private readonly entries = new Map<string, Promise<BackupEntry | undefined>>()

  constructor(
    /** The folder this run copies files into. */
    readonly dir: string,
    /** Files under `home` are copied relative to it. */
    private readonly home?: string,
    private readonly now: () => Date = () => new Date(),
    private readonly reason: BackupReason = 'apply',
  ) {}

  /** Back `path` up once per run, before its first change. Returns where it was copied, or undefined when it does not exist. */
  async snapshot(path: string): Promise<string | undefined> {
    if (!this.entries.has(path)) this.entries.set(path, this.copy(path))
    const entry = await this.entries.get(path)!
    return entry === undefined ? undefined : join(this.dir, entry.path)
  }

  private async copy(path: string): Promise<BackupEntry | undefined> {
    const info = await stat(path).catch(() => undefined)
    if (info === undefined) return undefined
    const target = await snapshotFile(path, this.dir, this.home)
    if (target === undefined) return undefined
    // Hash the copy, so the manifest describes what is actually held.
    const content = await readFile(target)
    return {
      path: backupRelativePath(path, this.home),
      sha256: createHash('sha256').update(content).digest('hex'),
      size: content.byteLength,
      mode: info.mode,
    }
  }

  /** Write the manifest. A run that copied nothing leaves no folder behind. */
  async finish(): Promise<void> {
    // A snapshot that failed copied nothing, so it is not described; the step that asked for it failed on its own.
    const settled = await Promise.allSettled(this.entries.values())
    const entries = settled.flatMap(item => (item.status === 'fulfilled' && item.value ? [item.value] : []))
    if (entries.length === 0) {
      await rm(this.dir, { recursive: true, force: true })
      return
    }
    const manifest: BackupManifest = {
      version: 1,
      createdAt: this.now().toISOString(),
      reason: this.reason,
      entries,
    }
    await writeFileAtomic(join(this.dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  }
}

function isBackupEntry(value: unknown): value is BackupEntry {
  return (
    isTable(value) &&
    typeof value.path === 'string' &&
    (value.sha256 === undefined || typeof value.sha256 === 'string') &&
    typeof value.size === 'number' &&
    typeof value.mode === 'number'
  )
}

/** A manifest as `BackupRun` writes it, or undefined when the text is not one. */
function parseManifest(text: string): Omit<BackupInfo, 'id'> | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isTable(parsed) || parsed.version !== 1 || typeof parsed.createdAt !== 'string') return undefined
  if (parsed.reason !== 'apply' && parsed.reason !== 'save' && parsed.reason !== 'restore') return undefined
  if (!Array.isArray(parsed.entries) || !parsed.entries.every(isBackupEntry)) return undefined
  return { createdAt: parsed.createdAt, reason: parsed.reason, entries: parsed.entries }
}

/** The files a run folder holds, walking it the way snapshots are mirrored into it. */
async function walkEntries(dir: string, prefix: readonly string[] = []): Promise<BackupEntry[]> {
  const items = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    items
      // The manifest describes the run; it is not a backed-up file.
      .filter(item => !(prefix.length === 0 && item.name === 'manifest.json'))
      .map(async item => {
        if (item.isDirectory()) return walkEntries(join(dir, item.name), [...prefix, item.name])
        if (!item.isFile()) return []
        const info = await stat(join(dir, item.name))
        return [{ path: [...prefix, item.name].join('/'), size: info.size, mode: info.mode }]
      }),
  )
  return nested.flat()
}

/** One run's contents: its manifest when it has one, its files otherwise. */
async function describeRun(root: string, id: string): Promise<Omit<BackupInfo, 'id'>> {
  const manifest = await readTextIfExists(join(root, id, 'manifest.json'))
  const parsed = manifest === undefined ? undefined : parseManifest(manifest)
  return parsed ?? { entries: await walkEntries(join(root, id)) }
}

/**
 * Every run under `root`, newest first. A run with a manifest is read from it; one from
 * before manifests existed is described by walking its files. The id is the folder's name.
 */
export async function listBackups(root: string): Promise<BackupInfo[]> {
  const dirs = await readdir(root, { withFileTypes: true }).catch(error => {
    // No folder yet means no backups yet, not a failure to read them.
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
    throw error
  })
  const backups = await Promise.all(
    dirs
      .filter(item => item.isDirectory())
      .map(dir => describeRun(root, dir.name).then(info => ({ id: dir.name, ...info }))),
  )
  // Run folders are named by their time, so their names sort newest first.
  return backups.toSorted((a, b) => b.id.localeCompare(a.id))
}

/**
 * Put a backup's files back under `home`, where every file ZCF backs up lives. Every
 * target that exists right now is first copied into a fresh run of its own, so the
 * restore itself can be undone with that run's id. Each file is written back atomically
 * at its recorded mode; a copy missing from the run folder fails the whole call, leaving
 * the files before it in place.
 */
export async function restoreBackup(
  root: string,
  id: string,
  home: string,
  now: () => Date = () => new Date(),
): Promise<RestoreResult> {
  const run = join(root, id)
  if (!(await stat(run).catch(() => undefined))?.isDirectory()) throw new Error(`No backup at ${run}`)
  const { entries } = await describeRun(root, id)
  if (entries.length === 0) throw new Error(`No backup files under ${run}`)

  // The files as they are now, so this restore can itself be restored away.
  const at = now()
  const undo = new BackupRun(backupRunDir(root, at), home, () => at, 'restore')
  await Promise.all(entries.map(entry => undo.snapshot(join(home, entry.path))))
  await undo.finish()

  let changed = 0
  let unchanged = 0
  let missing = 0
  for (const entry of entries) {
    // One file at a time: a later failure leaves the earlier files restored, not half-written.
    // oxlint-disable-next-line no-await-in-loop
    const backedUp = await readFile(join(run, entry.path))
    const target = join(home, entry.path)
    // oxlint-disable-next-line no-await-in-loop
    const current = await readFile(target).catch(() => undefined)
    if (current !== undefined && current.equals(backedUp)) unchanged++
    else {
      if (current === undefined) missing++
      else changed++
      // oxlint-disable-next-line no-await-in-loop
      await writeFileAtomic(target, backedUp)
    }
    // The write keeps an existing file's mode or makes a new one private; the recorded mode
    // wins, as far as the filesystem allows.
    // oxlint-disable-next-line no-await-in-loop
    await chmod(target, entry.mode & 0o7777).catch(() => undefined)
  }
  return { id: basename(undo.dir), changed, unchanged, missing }
}

/** Remove the oldest runs beyond the newest `keep`, returning the ids removed. */
export async function pruneBackups(root: string, keep = 20): Promise<string[]> {
  const doomed = (await listBackups(root)).slice(Math.max(0, keep)).map(backup => backup.id)
  for (const id of doomed) {
    // oxlint-disable-next-line no-await-in-loop
    await rm(join(root, id), { recursive: true, force: true })
  }
  return doomed
}
