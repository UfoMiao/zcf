import { createHash } from 'node:crypto'
import { chmod, readdir, readFile, rm, stat } from 'node:fs/promises'

import { basename, join } from 'pathe'

import { MessageError } from '../message-error'
import { isTable } from './editors'
import { backupRelativePath, isInsideHome, isMissing, readTextIfExists, snapshotFile, writeFileAtomic } from './fs'

/** Why a run's files were copied: an apply, a config save, or the undo copy a restore makes first. */
export type BackupReason = 'apply' | 'save' | 'restore'

/** One backed-up file. `path` is where it sits under the run folder, mirroring its place under home. */
export interface BackupEntry {
  path: string
  /** Missing for runs from before manifests existed, whose entries `listBackups` derives by walking. */
  sha256?: string
  size: number
  mode: number
  /** Set when the file sits outside home, so a restore cannot map `path` back to its place. */
  outside?: true
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
  /** The id of the run this restore copied the current files into, so it can be undone;
   * undefined when nothing existed to copy, so there is nothing to undo. */
  id?: string
  /** Files whose content differed and were written back. */
  changed: number
  /** Files already holding the backed-up content; only their recorded mode goes back on. */
  unchanged: number
  /** Files that no longer existed and were brought back. */
  missing: number
  /** Files whose copy in the run no longer hashes to its manifest entry, left untouched. */
  corrupt: number
  /** Files from outside home, whose place a restore cannot map back to, left untouched. */
  outside: number
}

/** A count of runs pruning may keep: whole decimal 0 or more, or undefined when `value` is not one. */
export function parseBackupKeep(value: unknown): number | undefined {
  if (typeof value === 'string') {
    // Decimal only: `0x10` and friends are more likely a typo than an answer.
    if (!/^\d+$/.test(value.trim())) return undefined
    return Number(value)
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined
  return value
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
  private held: BackupEntry[] = []

  constructor(
    /** The folder this run copies files into. */
    readonly dir: string,
    /** Files under `home` are copied relative to it. */
    private readonly home?: string,
    private readonly now: () => Date = () => new Date(),
    private readonly reason: BackupReason = 'apply',
  ) {}

  /** Whether the run holds no copies; settled once `finish` has run. */
  get empty(): boolean {
    return this.held.length === 0
  }

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
      sha256: sha256(content),
      size: content.byteLength,
      mode: info.mode,
      outside: isInsideHome(path, this.home) ? undefined : true,
    }
  }

  /** Write the manifest. A run that copied nothing leaves no folder behind. */
  async finish(): Promise<void> {
    // A snapshot that failed copied nothing, so it is not described; the step that asked for it failed on its own.
    const settled = await Promise.allSettled(this.entries.values())
    this.held = settled.flatMap(item => (item.status === 'fulfilled' && item.value ? [item.value] : []))
    if (this.held.length === 0) {
      await rm(this.dir, { recursive: true, force: true })
      return
    }
    const manifest: BackupManifest = {
      version: 1,
      createdAt: this.now().toISOString(),
      reason: this.reason,
      entries: this.held,
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
    typeof value.mode === 'number' &&
    (value.outside === undefined || value.outside === true)
  )
}

function sha256(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
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
    if (isMissing(error)) return []
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
 * Put a backup's files back under `home`. Every target that exists right now is first
 * copied into a fresh run of its own, so the restore itself can be undone with that
 * run's id — undefined in the result when nothing existed to copy. Each file is written
 * back atomically at its recorded mode; a copy missing from the run folder fails the
 * whole call, leaving the files before it in place, while a copy that no longer hashes
 * to its manifest entry is skipped as corrupt and the rest go on. A file from outside
 * home is skipped too: its home-relative place names a different folder, so writing it
 * would put it somewhere it never was. Entries walked out of a legacy run carry no
 * marker and are treated as files of home, which everything ZCF writes is.
 */
export async function restoreBackup(
  root: string,
  id: string,
  home: string,
  now: () => Date = () => new Date(),
): Promise<RestoreResult> {
  const run = join(root, id)
  if (!(await stat(run).catch(() => undefined))?.isDirectory())
    throw new MessageError({ key: 'cli.backup.missing', params: { id } }, `No backup at ${run}`)
  const { entries } = await describeRun(root, id)
  if (entries.length === 0)
    throw new MessageError({ key: 'cli.backup.empty', params: { id } }, `No backup files under ${run}`)

  // The files as they are now, so this restore can itself be restored away.
  const at = now()
  const undo = new BackupRun(backupRunDir(root, at), home, () => at, 'restore')
  await Promise.all(entries.map(async entry => (entry.outside ? undefined : undo.snapshot(join(home, entry.path)))))
  await undo.finish()

  let changed = 0
  let unchanged = 0
  let missing = 0
  let corrupt = 0
  let outside = 0
  for (const entry of entries) {
    if (entry.outside) {
      outside++
      continue
    }
    // One file at a time: a later failure leaves the earlier files restored, not half-written.
    // oxlint-disable-next-line no-await-in-loop
    const backedUp = await readFile(join(run, entry.path))
    // The manifest's hash catches a copy that went bad where it sits, before it overwrites.
    if (entry.sha256 !== undefined && sha256(backedUp) !== entry.sha256) {
      corrupt++
      continue
    }
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
  return { id: undo.empty ? undefined : basename(undo.dir), changed, unchanged, missing, corrupt, outside }
}

/**
 * The ids pruning would remove from `backups` beyond the newest `keep`, newest-first like
 * `backups`. At least the newest run always stays: 0 would take the undo copy a restore
 * just made along with everything else.
 */
export function pruneDoomed(backups: readonly BackupInfo[], keep: number): string[] {
  return backups.slice(Math.max(1, keep)).map(backup => backup.id)
}

/** Remove the oldest runs beyond the newest `keep`, returning the ids removed. */
export async function pruneBackups(root: string, keep = 20): Promise<string[]> {
  const doomed = pruneDoomed(await listBackups(root), keep)
  for (const id of doomed) {
    // oxlint-disable-next-line no-await-in-loop
    await rm(join(root, id), { recursive: true, force: true })
  }
  return doomed
}
