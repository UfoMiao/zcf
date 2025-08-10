export const installation = {
  installPrompt: 'Claude Code not found. Install automatically?',
  installing: 'Installing Claude Code...',
  installSuccess: 'Claude Code installed successfully',
  alreadyInstalled: 'Claude Code is already installed',
  installFailed: 'Failed to install Claude Code',
  npmNotFound: 'npm is not installed. Please install Node.js and npm first.',
  
  // Termux specific
  termuxDetected: 'Termux environment detected',
  termuxInstallHint: 'In Termux, please run first: pkg install nodejs or pkg install nodejs-lts',
  termuxPathInfo: 'Using Termux path: {path}',
  termuxEnvironmentInfo: 'Termux environment provides Node.js and npm through pkg manager',
  
  // Windows specific
  windowsDetected: 'Windows detected, will configure compatible format',
};