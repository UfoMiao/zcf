import { 
  existsSync, 
  mkdirSync, 
  readFileSync, 
  writeFileSync, 
  copyFileSync,
  readdirSync,
  statSync,
  type Stats
} from 'node:fs';
import { dirname } from 'pathe';

/**
 * Unified file system operations with error handling
 */
export class FileSystemError extends Error {
  constructor(message: string, public readonly path?: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * Check if a file or directory exists
 */
export function exists(path: string): boolean {
  return existsSync(path);
}

/**
 * Ensure a directory exists, create it if not
 */
export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

/**
 * Ensure the parent directory of a file exists
 */
export function ensureFileDir(filePath: string): void {
  const dir = dirname(filePath);
  ensureDir(dir);
}

/**
 * Read file content as string
 */
export function readFile(path: string, encoding: BufferEncoding = 'utf-8'): string {
  try {
    return readFileSync(path, encoding);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${path}`,
      path,
      error as Error
    );
  }
}

/**
 * Write content to file
 */
export function writeFile(path: string, content: string, encoding: BufferEncoding = 'utf-8'): void {
  try {
    ensureFileDir(path);
    writeFileSync(path, content, encoding);
  } catch (error) {
    throw new FileSystemError(
      `Failed to write file: ${path}`,
      path,
      error as Error
    );
  }
}

/**
 * Copy a file from source to destination
 */
export function copyFile(src: string, dest: string): void {
  try {
    ensureFileDir(dest);
    copyFileSync(src, dest);
  } catch (error) {
    throw new FileSystemError(
      `Failed to copy file from ${src} to ${dest}`,
      src,
      error as Error
    );
  }
}

/**
 * Read directory contents
 */
export function readDir(path: string): string[] {
  try {
    return readdirSync(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read directory: ${path}`,
      path,
      error as Error
    );
  }
}

/**
 * Get file/directory stats
 */
export function getStats(path: string): Stats {
  try {
    return statSync(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to get stats for: ${path}`,
      path,
      error as Error
    );
  }
}

/**
 * Check if path is a directory
 */
export function isDirectory(path: string): boolean {
  try {
    return getStats(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if path is a file
 */
export function isFile(path: string): boolean {
  try {
    return getStats(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Copy directory recursively with optional filter
 */
export interface CopyDirOptions {
  filter?: (path: string, stats: Stats) => boolean;
  overwrite?: boolean;
}

export function copyDir(src: string, dest: string, options: CopyDirOptions = {}): void {
  const { filter, overwrite = true } = options;

  if (!exists(src)) {
    throw new FileSystemError(`Source directory does not exist: ${src}`, src);
  }

  ensureDir(dest);

  const entries = readDir(src);

  for (const entry of entries) {
    const srcPath = `${src}/${entry}`;
    const destPath = `${dest}/${entry}`;
    const stats = getStats(srcPath);

    // Apply filter if provided
    if (filter && !filter(srcPath, stats)) {
      continue;
    }

    if (stats.isDirectory()) {
      copyDir(srcPath, destPath, options);
    } else {
      if (!overwrite && exists(destPath)) {
        continue;
      }
      copyFile(srcPath, destPath);
    }
  }
}