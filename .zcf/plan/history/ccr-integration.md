# CCR Menu Integration Plan

## Task Context
需要合并配置API和配置CCR的菜单，统一为"配置API或CCR代理"，并在API配置选项中添加"使用CCR代理"选项。

## Current Status
- CCR已经集成到init命令中（作为第三个选项）
- 独立的CCR配置命令已存在（menu中的选项R）
- 需要将menu中的API配置和CCR配置合并

## Solution Design
采用完全合并方案，将API和CCR配置合并为单一菜单项，统一处理所有API相关配置。

## Implementation Steps

### Step 1: Update i18n Translation Files ✅
- Modify menu option text from "配置 API" to "配置 API 或 CCR 代理"
- Add CCR proxy option descriptions
- Files: `src/i18n/locales/zh-CN/menu.ts`, `src/i18n/locales/en/menu.ts`
- Files: `src/i18n/locales/zh-CN/index.ts`, `src/i18n/locales/en/index.ts`

### Step 2: Update Menu Display
- Remove standalone CCR menu item (option R)
- Update API configuration menu text (option 3)
- File: `src/commands/menu.ts`

### Step 3: Update configureApiFeature Function
- Add CCR proxy as third option in API configuration
- Implement CCR configuration logic when selected
- Import necessary CCR functions
- File: `src/utils/features.ts`

### Step 4: Verify init.ts CCR Logic
- Ensure existing CCR integration remains functional
- Already supports CCR option - no changes needed

## Expected Results
- Menu option 3: "配置 API 或 CCR 代理" / "Configure API or CCR Proxy"
- When selected, three choices: Auth Token, API Key, CCR Proxy
- CCR option removed from "Other Tools" section
- Seamless CCR configuration flow when selected
- Init command continues to work with CCR option