# Default Model and Language Configuration Enhancement

## Task Description

1. Add a "default" option in model configuration that removes the model field from settings.json, allowing Claude Code to auto-select models
2. Fix AI output language configuration in menu to show existing config and ask for modification (like AI personality config), instead of auto-skipping

## Context

- Project: ZCF (Zero-Config Code Flow)
- Date: 2025-08-11
- Task Type: Feature Enhancement

## Requirements

1. **Model Configuration Enhancement**
   - Add "Default (Let Claude Code choose)" option
   - When selected, delete the `model` field from settings.json
   - Show existing model configuration before asking

2. **Language Configuration Fix**
   - Remove auto-skip behavior in menu (keep it for init/update commands)
   - Show current language configuration
   - Ask user if they want to modify
   - Match the behavior of AI personality configuration

## Implementation Plan

### Files Modified

1. **src/utils/config.ts**
   - Modified `updateDefaultModel` to accept 'default' parameter
   - Added `getExistingModelConfig` function to check current model setting
   - When 'default' is selected, delete the model field from settings

2. **src/utils/features.ts**
   - Updated `configureDefaultModelFeature` to show existing config
   - Added confirmation prompt before modification
   - Modified `configureAiMemoryFeature` language branch to avoid `resolveAiOutputLanguage`
   - Implemented direct language selection with existing config check

3. **src/i18n/locales/zh-CN/configuration.ts**
   - Added model-related translations
   - Added language configuration translations

4. **src/i18n/locales/en/configuration.ts**
   - Added corresponding English translations

## Key Changes

### Model Configuration
```typescript
// Now supports 'default' option
export function updateDefaultModel(model: 'opus' | 'sonnet' | 'default') {
  if (model === 'default') {
    delete settings.model;  // Remove field for auto-selection
  } else {
    settings.model = model;
  }
}
```

### Language Configuration
```typescript
// Direct implementation without resolveAiOutputLanguage
if (existingLang) {
  // Show existing config and ask for modification
  const { modify } = await inquirer.prompt(...);
  if (!modify) return;
}
// Use selectAiOutputLanguage directly
```

## Testing Checklist

- [x] Default model option appears in menu
- [x] Selecting default removes model field from settings.json
- [x] Existing model configuration is displayed
- [x] Language configuration shows existing setting
- [x] Language configuration asks for modification confirmation
- [x] Init and update commands still auto-skip when language is configured

## Result

All requirements have been successfully implemented. The menu now provides better user experience by showing existing configurations and asking for explicit modification confirmation, while maintaining the auto-skip behavior in init/update workflows.