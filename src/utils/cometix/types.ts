/**
 * Types for CCometixLine integration
 */

export interface CometixInstallationStatus {
  isInstalled: boolean;
  version?: string;
}

export interface CometixCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface CometixMenuChoice {
  type: 'install' | 'config' | 'back';
  description: string;
}

export type CometixAction = 'install' | 'update' | 'print-config';

export interface CometixTranslations {
  installingCometix: string;
  cometixInstallSuccess: string;
  cometixInstallFailed: string;
  cometixAlreadyInstalled: string;
  installCometixPrompt: string;
  cometixSkipped: string;
  installingOrUpdating: string;
  installUpdateSuccess: string;
  installUpdateFailed: string;
  printingConfig: string;
  printConfigSuccess: string;
  printConfigFailed: string;
  commandNotFound: string;
  cometixMenuTitle: string;
  cometixMenuOptions: {
    installOrUpdate: string;
    printConfig: string;
    back: string;
  };
  cometixMenuDescriptions: {
    installOrUpdate: string;
    printConfig: string;
  };
}