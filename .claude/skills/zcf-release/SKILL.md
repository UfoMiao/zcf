---
name: zcf-release
description: Prepare a ZCF release with changesets, a bilingual changelog, a release branch and a pull request
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(node:*)
---

# ZCF Release

Prepare a release PR. Merging it to `main` makes `.github/workflows/release.yml` run the tests, publish to npm and create the tag and GitHub Release.

Usage: `/zcf-release [-p|-mi|-ma|<version>]`: `-p`/`--patch` (default), `-mi`/`--minor`, `-ma`/`--major`, or an exact semver such as `3.8.0` or `4.0.0-beta.1`. Arguments: $ARGUMENTS

Never create or push git tags yourself; the release workflow does it after merge.

## Steps

1. **Start clean.** Fetch and work from an up-to-date `main`. If there are uncommitted changes, show them and ask whether they belong in this release. Commit them separately with a proper Conventional Commits message, staging files by name.
2. **Collect changes.** Last tag: `git describe --tags --abbrev=0`. Read `git log <tag>..HEAD` and the diff, and group user-visible changes into New Features / Optimization / Fixes / Documentation. Skip internal-only commits (CI, tests, chores) unless they matter to users.
3. **Write the changeset.** Create `.changeset/release-<timestamp>.md`:

   ```markdown
   ---
   "zcf": patch
   ---

   ## New Features

   - English entry

   ## 新功能

   - 中文条目
   ```

   Each section is in English first, then the same section in Chinese; never mix languages on one line. Changesets only accept `patch`, `minor` or `major` here. For an exact version, pick the bump type that reaches it. If none does (for example a pre-release), run step 4 with `patch`, then set `version` in `package.json` and the new top heading in `CHANGELOG.md` to the exact version.
4. **Apply.** Run `pnpm changeset version`, which bumps `package.json`, updates `CHANGELOG.md` and deletes the changeset file. Read the new version from `package.json` and show the user the CHANGELOG diff.
5. **Verify.** Run `pnpm typecheck`, `pnpm test:run` and `pnpm build`. Stop and report if any of them fail.
6. **Branch, commit, PR.**
   - `git checkout -b release/v<version>`
   - `git add package.json CHANGELOG.md`, then `git commit -m "chore: release v<version>"`
   - `git push -u origin release/v<version>`
   - `gh pr create --title "chore: release v<version>"` with a body based on `.github/PULL_REQUEST_TEMPLATE` that contains the changelog section. Tick only the checks that you ran in step 5.
7. **Report** the PR URL and remind the user that merging it publishes to npm.
