import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readlink, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { dirname, join, normalize, relative, resolve } from 'pathe'

export async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}

async function modeOf(path: string): Promise<number | undefined> {
  try {
    return (await stat(path)).mode
  } catch {
    return undefined
  }
}

/** The file a write to `path` should replace: the end of its symlink chain, even when that file does not exist yet. */
async function writeTarget(path: string): Promise<string> {
  try {
    return await realpath(path)
  } catch {
    // A dangling link: write where it points, so dotfile managers keep their link.
    const link = await readlink(path).catch(() => undefined)
    return link === undefined ? path : resolve(dirname(path), link)
  }
}

/**
 * Write through a temporary file in the same directory and rename it into place,
 * so a crash never leaves a half-written config. A symlink is followed so the
 * link itself survives. An existing file keeps its mode; a new one is private,
 * since native configs hold API keys.
 */
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  const target = await writeTarget(path)
  await mkdir(dirname(target), { recursive: true })
  const mode = (await modeOf(target)) ?? 0o600
  const temp = `${target}.zcf-${process.pid}-${randomUUID()}.tmp`
  try {
    await writeFile(temp, content, { mode })
    await rename(temp, target)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}

/**
 * Map an absolute path to a relative one that is safe to recreate under a backup folder:
 * relative to `home` when it is inside it, otherwise the absolute path without its root.
 */
export function backupRelativePath(path: string, home?: string): string {
  const normalized = normalize(path)
  if (home) {
    const inside = relative(normalize(home), normalized)
    if (inside && !inside.startsWith('..') && !/^[a-z]:/i.test(inside) && !inside.startsWith('/')) return inside
  }
  return normalized.replace(/^[a-z]:/i, drive => drive[0]!).replace(/^\/+/, '')
}

/** Copy `path` into `backupRoot`, mirroring its location. Returns undefined when there is nothing to back up. */
export async function snapshotFile(path: string, backupRoot: string, home?: string): Promise<string | undefined> {
  if ((await modeOf(path)) === undefined) return undefined

  const target = join(backupRoot, backupRelativePath(path, home))
  await mkdir(dirname(target), { recursive: true })
  await copyFile(path, target)
  return target
}
