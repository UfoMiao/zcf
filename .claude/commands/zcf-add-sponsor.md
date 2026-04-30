---
description: Quickly add a new corporate sponsor to ZCF — sponsor list by default, with optional API preset and documentation ad placements
allowed-tools: Read(**), Write(**), Edit(**), Exec(ls, cat, grep, rg, sed, awk, file)
argument-hint: [--with-api] [--with-ad] [--name <name>] [--url <url>] [--id <provider-id>] [--logo <path>] [--badge <emoji>]
# examples:
#   - /zcf-add-sponsor                                                          # Interactive mode, only add to README Our Sponsors lists
#   - /zcf-add-sponsor --name "FooAI" --url "https://foo.ai/?aff=zcf"           # Non-interactive, only add to sponsor lists
#   - /zcf-add-sponsor --with-api --id fooai --name "FooAI" --url "https://..." # Sponsor lists + API provider preset
#   - /zcf-add-sponsor --with-ad --logo ./src/assets/fooai.png --name "FooAI"   # Sponsor lists + ad cards in READMEs and docs/*/index.md
#   - /zcf-add-sponsor --with-api --with-ad ...                                 # Full integration in one shot
---

# ZCF Add Sponsor — Quick Sponsor Onboarding

Quickly onboard a new **corporate sponsor** across the ZCF project: README sponsor lists by default, with optional API provider preset and documentation ad placements.

## Usage

```bash
/zcf-add-sponsor [--with-api] [--with-ad] [--name <name>] [--url <url>] [--id <provider-id>] [--logo <path>] [--badge <emoji>]
```

## Parameters

### Mode flags

- `--with-api` — Also append a new entry to `src/config/api-providers.ts` (`API_PROVIDER_PRESETS`)
- `--with-ad` — Also insert ad cards into:
  - `README.md`, `README_zh-CN.md`, `README_ja-JP.md` (top `♥️ Sponsors` section, table card)
  - `docs/en/index.md`, `docs/zh-CN/index.md`, `docs/ja-JP/index.md` (top `♥️ Sponsor` section, table card)
- *(no flag)* — Default: only add a single bullet entry to the **Our Sponsors → Corporate Sponsors** lists in the three READMEs

### Sponsor info (prompt interactively if missing)

- `--name <name>` — Display name (e.g. `FooAI`)
- `--url <url>` — Affiliate/registration URL (used in every link)
- `--id <provider-id>` — API provider id, kebab-case (only required with `--with-api`, e.g. `fooai`)
- `--logo <path>` — Local logo path under `src/assets/` (only required with `--with-ad`, e.g. `./src/assets/fooai.png`)
- `--badge <emoji>` — Trailing emoji badge for the list bullet (default: `🎁`)

## Context

- **Default scope**: Only the `Our Sponsors → Corporate Sponsors` bullet list in the three READMEs (zh-CN, en, ja-JP). `docs/*/index.md` does **not** contain a sponsor list — it only contains an ad section, handled by `--with-ad`.
- **API preset format**: Match the existing `ApiProviderPreset` interface in `src/config/api-providers.ts`. Ask the user about `baseUrl`, `authType`, `wireApi`, `defaultModels`, and which code tools are supported (`claude-code`, `codex`, or both).
- **Ad cards**: Mirror the existing AICodeMirror / Crazyrouter card layout exactly — `<table><tr><td width="180"><a><img></a></td><td>...description...</td></tr></table>`, appended **after** the last existing sponsor card and **before** the next `##` heading.
- **Image paths**:
  - In `README*.md` use relative path `./src/assets/<file>`
  - In `docs/*/index.md` use absolute GitHub raw URL `https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/<file>`
- **Trilingual descriptions**: Always generate three localized descriptions (zh-CN / en / ja-JP). Translate from the user-provided source description while preserving brand names, URLs, and discount numbers verbatim.

## Your Role

You are a project documentation maintainer. Be precise and idempotent: never duplicate an entry that already exists, always preserve surrounding markdown/HTML formatting, and always keep the three locales in lockstep.

## Execution Flow

Parse arguments: $ARGUMENTS

### 1. Argument parsing & validation

```text
Parse from $ARGUMENTS:
  WITH_API=false        # toggled by --with-api
  WITH_AD=false         # toggled by --with-ad
  NAME=""               # --name <name>
  URL=""                # --url <url>
  PROVIDER_ID=""        # --id <id>
  LOGO_PATH=""          # --logo <path>
  BADGE="🎁"            # --badge <emoji>, default 🎁

Validation:
  - NAME and URL are always required → if missing, prompt user
  - If WITH_API: PROVIDER_ID required → if missing, prompt user.
    Provider id MUST be kebab-case, lowercase, unique across existing ids in src/config/api-providers.ts
  - If WITH_AD: LOGO_PATH required → if missing, prompt user.
    Verify the logo file exists at the given path (relative to repo root).
    If not, instruct the user to place the logo under src/assets/ first and abort.
```

### 2. Collect missing sponsor information (interactive)

If any required field is missing, ask the user **once** in a consolidated prompt covering:

- Source description (1–3 sentences, in the user's preferred language)
- Special offer / discount line (optional, e.g. "Use code zcf for 10% off")
- For `--with-api`:
  - Supported code tools: `claude-code` / `codex` / both
  - Claude Code `baseUrl` and `authType` (`api_key` | `auth_token`)
  - Codex `baseUrl` (always `wireApi: 'responses'` per existing convention)
  - Optional `defaultModels` array (Claude Code) or `defaultModel` string (Codex)

Then auto-translate the description into the other two languages, preserving brand names, URLs, and numbers.

### 3. Idempotency check

Before any write, scan target files for the sponsor name or URL. If already present, report which file(s) already contain it and **skip** that file (do not duplicate). Continue with remaining files.

```bash
rg -l --fixed-strings "<NAME>" README.md README_zh-CN.md README_ja-JP.md docs/en/index.md docs/zh-CN/index.md docs/ja-JP/index.md src/config/api-providers.ts 2>/dev/null
```

### 4. Update sponsor lists (default — always runs)

Locate the **Corporate Sponsors** bullet list in each README and append a new bullet **at the end** of that list (before the `【Individual Sponsors】` / `【个人赞助商】` / `【個人スポンサー】` heading):

- `README.md` — under `【Corporate Sponsors】`:
  ```
  - [<NAME>](<URL>) (<EN_TAGLINE> <BADGE>)
  ```
- `README_zh-CN.md` — under `【企业赞助商】`:
  ```
  - [<NAME>](<URL>) （<ZH_TAGLINE> <BADGE>）
  ```
- `README_ja-JP.md` — under `【企業スポンサー】`:
  ```
  - [<NAME>](<URL>)（<JP_TAGLINE> <BADGE>）
  ```

`<*_TAGLINE>` is a short 4–10 char positioning phrase derived from the source description (e.g. "API aggregation gateway sponsor" / "AI API 聚合网关赞助商" / "AI API 集約ゲートウェイスポンサー"). Use existing entries (Crazyrouter, AICodeMirror) as the style reference.

### 5. Insert ad cards — only if `--with-ad`

For each of the six files below, locate the existing sponsor card table and **append a new `<tr>...</tr>` row to the same `<table>`** (or, if the existing structure uses sibling `<table>` blocks, append a new sibling table immediately after the last one). Match the exact layout of the most recent existing card.

**Target files & image base path:**

| File | Image path prefix |
|------|-------------------|
| `README.md` | `./src/assets/` |
| `README_zh-CN.md` | `./src/assets/` |
| `README_ja-JP.md` | `./src/assets/` |
| `docs/en/index.md` | `https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/` |
| `docs/zh-CN/index.md` | `https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/` |
| `docs/ja-JP/index.md` | `https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/` |

**Card template (reference, fill brackets per locale):**

```html
<table>
<tr>
<td width="180"><a href="<URL>"><img src="<IMG_PREFIX><LOGO_FILENAME>" alt="<NAME>" width="150"></a></td>
<td><LOCALIZED_DESCRIPTION_INCLUDING_OFFER_AND_LINK></td>
</tr>
</table>
```

> **Important**: Insert **after** the last existing sponsor card and **before** the next `##` heading (typically `## 📺 ...` or `## ✨ ...`). Preserve surrounding blank lines.

### 6. Add API provider preset — only if `--with-api`

Edit `src/config/api-providers.ts`. Append a new object to the `API_PROVIDER_PRESETS` array, **before the closing `]`**, mirroring the style of existing entries:

```ts
  {
    id: '<PROVIDER_ID>',
    name: '<NAME>',
    supportedCodeTools: [<'claude-code' and/or 'codex'>],
    claudeCode: {
      baseUrl: '<CC_BASE_URL>',
      authType: '<api_key|auth_token>',
      // defaultModels: [...],     // include only if user provided
    },
    codex: {                       // include only if codex is supported
      baseUrl: '<CODEX_BASE_URL>',
      wireApi: 'responses',
      // defaultModel: '...',      // include only if user provided
    },
    description: '<EN_DESCRIPTION>',
  },
```

Then run `pnpm typecheck` to confirm no type errors. If the project has corresponding tests for `getValidProviderIds()` or fixtures, surface them in the summary so the user can update tests if needed.

### 7. Validation

```text
✓ List bullets present in all 3 READMEs (or skipped due to existing entry)
✓ If --with-ad: card rows present in all 6 target files (or skipped)
✓ If --with-api: new preset object syntactically valid; pnpm typecheck passes
✓ No duplicate ids in API_PROVIDER_PRESETS
✓ All URLs identical across files
✓ Logo file exists at src/assets/<filename> when --with-ad is used
```

### 8. Summary report

Print a concise summary:

```
🎉 Sponsor "<NAME>" added

Sponsor list bullets:
  ✓ README.md
  ✓ README_zh-CN.md
  ✓ README_ja-JP.md

Ad cards (--with-ad): [yes/no]
  ✓/⊘ README.md / README_zh-CN.md / README_ja-JP.md
  ✓/⊘ docs/en/index.md / docs/zh-CN/index.md / docs/ja-JP/index.md

API preset (--with-api): [yes/no]
  ✓/⊘ src/config/api-providers.ts (id: <PROVIDER_ID>)

Skipped (already present): [list]

Next steps:
  - Review changes with: git diff
  - If --with-api: consider adding tests in tests/ for the new provider
  - Commit with: /zcf-pr or your preferred flow
```

## Important Notes

⚠️ **Critical Requirements**

- **NEVER** modify any sponsor entries other than the ones being added
- **NEVER** reorder existing sponsors
- **ALWAYS** keep the three locale READMEs in sync (same bullet count, same URL, semantically equivalent text)
- **ALWAYS** verify logo file existence under `src/assets/` before writing ad cards
- **ALWAYS** validate the API preset by running `pnpm typecheck` after editing
- **DO NOT** create commits or push — leave that to the user / `/zcf-pr`
- **DO NOT** invent new section headings; reuse the exact existing ones (`【Corporate Sponsors】` / `【企业赞助商】` / `【企業スポンサー】`)

📌 **Style Reference**

When in doubt, copy the structure of the most recent existing sponsor entry (currently **Crazyrouter**) — it represents the canonical layout for both bullet entries and ad cards across all six target documents.

🔍 **Idempotency**

Re-running with the same `--name` and `--url` MUST be a no-op. Detection is by exact match on either NAME or URL within the relevant section.

---

**Now starting sponsor onboarding...**
