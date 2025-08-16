import { exec } from 'child_process';
import { promisify } from 'util';
import semver from 'semver';

const execAsync = promisify(exec);


export async function getInstalledVersion(command: string): Promise<string | null> {
  try {
    // Try -v first (more universal), then --version
    let stdout: string;
    try {
      const result = await execAsync(`${command} -v`);
      stdout = result.stdout;
    } catch {
      // Fallback to --version if -v doesn't work
      const result = await execAsync(`${command} --version`);
      stdout = result.stdout;
    }
    
    // Extract version from output
    const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
    return versionMatch ? versionMatch[1] : null;
  } catch {
    return null;
  }
}

export async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`npm view ${packageName} version`);
    return stdout.trim();
  } catch {
    return null;
  }
}

export function compareVersions(current: string, latest: string): number {
  // Returns: -1 if current < latest, 0 if equal, 1 if current > latest
  if (!semver.valid(current) || !semver.valid(latest)) {
    return -1; // Assume update needed if version is invalid
  }
  
  return semver.compare(current, latest);
}

export function shouldUpdate(current: string, latest: string): boolean {
  return compareVersions(current, latest) < 0;
}

export async function checkCcrVersion(): Promise<{
  installed: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  needsUpdate: boolean;
}> {
  const currentVersion = await getInstalledVersion('ccr');
  // Get the latest version from npm
  const latestVersion = await getLatestVersion('@musistudio/claude-code-router');
  
  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false
  };
}

export async function checkClaudeCodeVersion(): Promise<{
  installed: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  needsUpdate: boolean;
}> {
  const currentVersion = await getInstalledVersion('claude');
  const latestVersion = await getLatestVersion('@anthropic-ai/claude-code');
  
  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false
  };
}

export async function checkCometixLineVersion(): Promise<{
  installed: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  needsUpdate: boolean;
}> {
  const currentVersion = await getInstalledVersion('ccometix');
  const latestVersion = await getLatestVersion('ccometix');
  
  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false
  };
}