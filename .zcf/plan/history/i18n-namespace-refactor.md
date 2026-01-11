# I18N Namespace Refactor Plan

## Problem
Current i18n implementation uses flat structure with spread operators, causing key conflicts.
Example: `bmad.installSuccess` overwrites `installation.installSuccess`

## Solution
Refactor i18n to maintain module namespaces, using calls like:
- `i18n.installation.installSuccess` 
- `i18n.bmad.installSuccess`

## Implementation Steps

### Phase 1: Refactor Structure
1. Update type definitions to support nested structure
2. Modify language index files to maintain module structure
3. Update I18N constant export

### Phase 2: Update Call Sites
4. Search and update all i18n usage
5. Change from `i18n.key` to `i18n.module.key`

### Phase 3: Validation
6. Run type checking
7. Build project
8. Test functionality

## Benefits
- Eliminates naming conflicts
- Improves code maintainability
- Better semantic clarity
- Easier future expansion