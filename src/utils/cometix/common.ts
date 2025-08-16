/**
 * Common utilities for CCometixLine operations
 */

export const COMETIX_PACKAGE_NAME = '@cometix/ccline';
export const COMETIX_COMMAND_NAME = 'ccline';

/**
 * CCometixLine specific npm commands
 */
export const COMETIX_COMMANDS = {
  CHECK_INSTALL: `npm list -g ${COMETIX_PACKAGE_NAME}`,
  INSTALL: `npm install -g ${COMETIX_PACKAGE_NAME}`,
  UPDATE: `npm update -g ${COMETIX_PACKAGE_NAME}`,
  PRINT_CONFIG: `${COMETIX_COMMAND_NAME} --print`,
} as const;
