/**
 * CCometixLine specific error handling
 */

export class CometixError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CometixError';
  }
}

export class CometixInstallationError extends CometixError {
  constructor(message: string, cause?: Error) {
    super(message, 'INSTALLATION_FAILED', cause);
    this.name = 'CometixInstallationError';
  }
}

export class CometixCommandError extends CometixError {
  constructor(message: string, cause?: Error) {
    super(message, 'COMMAND_FAILED', cause);
    this.name = 'CometixCommandError';
  }
}

export class CometixNotInstalledError extends CometixError {
  constructor() {
    super('CCometixLine is not installed', 'NOT_INSTALLED');
    this.name = 'CometixNotInstalledError';
  }
}

/**
 * Utility function to determine if an error is related to command not found
 */
export function isCommandNotFoundError(error: Error): boolean {
  return error.message.includes('command not found') || 
         error.message.includes('ccline');
}

/**
 * Utility function to determine if an error is related to npm package not found
 */
export function isPackageNotFoundError(error: Error): boolean {
  return error.message.includes('404 Not Found') || 
         error.message.includes('Package not found');
}