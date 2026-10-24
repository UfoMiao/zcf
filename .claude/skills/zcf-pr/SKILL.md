---
name: zcf-pr
description: Create a pull request for the current branch with a description based on the project PR template
disable-model-invocation: true
allowed-tools: Read, Write, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(rm:*)
---

# ZCF PR

Open a pull request for the current branch.

Usage: `/zcf-pr [--base <branch>] [--draft] [--title <title>]` (base defaults to `main`). Arguments: $ARGUMENTS

## Steps

1. **Preconditions.** Stop with a one-line explanation if the current branch is the base branch, or if there are no commits ahead of the base. If there are uncommitted changes, list them and ask whether to commit them (stage by name, never `git add .`) or leave them out.
2. **Understand the change.** Read `git log <base>..HEAD` and `git diff <base>...HEAD`. Classify it from the diff itself, not from keywords in commit messages.
3. **Verify proportionally.** Unless this session already ran them on the current HEAD, run the checks that `AGENTS.md` calls for on the changed paths: the "Check with" column of its trigger table, plus `pnpm typecheck` and `pnpm test:run` (about 60 s together) when source files changed. Docs-only branches need no tests. Report failures to the user instead of opening the PR.
4. **Title.** Use `--title` if given; otherwise a Conventional Commits title (at most 100 characters) that summarizes the whole branch, not just its first commit.
5. **Body.** Fill in `.github/PULL_REQUEST_TEMPLATE`:
   - Description: what changed and why, in a few sentences. Link related issues.
   - Type of Change: tick what the diff shows. Breaking change only if CLI flags, defaults or written config change incompatibly.
   - Testing and Checklist: tick only what actually happened in this session, such as tests you ran or added. Leave the rest unticked rather than guessing.
   - Mention anything not verified (for example Windows behavior).
6. **Push and create.** `git push -u origin <branch>`, then `gh pr create --base <base> --title ... --body-file <tmpfile>` (add `--draft` if requested). Delete the temp file afterwards and print the PR URL.
