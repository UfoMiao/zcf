# Task: Add AICodeMirror API Preset

## Context

Add AICodeMirror API provider preset with two variants:
- `aicodemirror`: Global High-Quality Line
- `aicodemirror-cn`: China Optimized Line

## Configuration Details

| Variant | ClaudeCode URL | Codex URL |
|---------|---------------|-----------|
| Global | `https://api.aicodemirror.com/api/claudecode` | `https://api.aicodemirror.com/api/codex/backend-api/codex` |
| CN | `https://api.claudecode.net.cn/api/claudecode` | `https://api.claudecode.net.cn/api/codex/backend-api/codex` |

- Auth Type: `auth_token`
- Codex Wire API: `responses`

## Execution Steps

- [x] Step 1: Modify `src/config/api-providers.ts` - Add two new presets after PackyCode
- [ ] Step 2: Update `tests/unit/config/api-providers.test.ts` - Add test cases
- [ ] Step 3: Update `docs/zh-CN/advanced/api-providers.md` - Chinese documentation
- [ ] Step 4: Update `docs/en/advanced/api-providers.md` - English documentation
- [ ] Step 5: Update `docs/ja-JP/advanced/api-providers.md` - Japanese documentation

## Expected Results

- Users can use `npx zcf init -s -p aicodemirror -k "token"` for global line
- Users can use `npx zcf init -s -p aicodemirror-cn -k "token"` for CN line
- Both Claude Code and Codex supported
- Full test coverage
- Trilingual documentation updated
