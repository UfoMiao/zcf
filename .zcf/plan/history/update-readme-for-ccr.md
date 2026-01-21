# Update README for CCR Feature

## Context

This plan documents the updates made to README files to reflect the new CCR (Claude Code Router) functionality added in the `feat/add-ccr-config` branch.

## Task Description

Analyze the CCR feature updates in the branch and update both README.md and README_zh-CN.md to properly document the new functionality.

## Implementation Plan

### 1. Analysis Phase
- Reviewed all commits related to CCR feature
- Identified key functionality: CCR proxy configuration, management menu, preset providers
- Understood the integration with existing ZCF workflows

### 2. Updates to README.md
- Added `zcf ccr` command to the command reference table
- Created new CCR feature section after BMad workflow section
- Updated menu option descriptions to include CCR management
- Modified option 3 description to mention CCR proxy support

### 3. Updates to README_zh-CN.md
- Added `zcf ccr` command to the command reference table (Chinese)
- Created new CCR feature section with Chinese translations
- Updated menu option descriptions to include CCR management
- Modified option 3 description to mention CCR proxy support

## Key Features Documented

1. **CCR Command**: `npx zcf ccr` - Opens CCR management menu
2. **Main Benefits**:
   - Free model access (Gemini, DeepSeek, etc.)
   - Custom routing rules
   - Cost optimization
   - Easy management interface
3. **Menu Options**:
   - Initialize CCR with preset providers
   - Launch CCR UI for advanced configuration
   - Service control (start/stop/restart)
   - Status checking

## Summary

Successfully updated both README files to comprehensively document the new CCR functionality, ensuring users can easily discover and understand this powerful new feature for API cost optimization and model routing.