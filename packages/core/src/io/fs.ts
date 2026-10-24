import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { dirname, join, normalize, relative } from 'pathe'

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

/**
 * Write through a temporary file in the same directory and rename it into place,
 * so a crash never leaves a half-written config. An existing file keeps its mode.
 */
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const mode = await modeOf(path)
  const temp = `${path}.zcf-${process.pid}-${Date.now()}.tmp`
  await writeFile(temp, content, mode === undefined ? undefined : { mode })
  await rename(temp, path)
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
