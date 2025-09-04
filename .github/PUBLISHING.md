# Publishing Guide

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated publishing.

## 🚀 Quick Start

### 1. Add Changeset

After completing feature development or fixes, create a changeset:

```bash
pnpm changeset
```

Follow the prompts to select:

- Change type (patch/minor/major)
- Enter change description (supports Markdown)

### 2. Automated Release Process (Recommended)

1. **Create PR**: Push your code to a branch and create a PR to main
2. **Merge PR**: Merge after code review approval
3. **Auto-create Release PR**: Changesets bot will automatically create a "Version Packages" PR
4. **Merge Release PR**: Auto-publish to npm after merging

## 📦 Release Process Details

### Automated Workflow

When code is merged to the main branch:

1. GitHub Actions detects new changesets
2. Automatically creates/updates "Version Packages" PR, including:
   - Version number updates
   - CHANGELOG generation
   - Changeset file cleanup
3. Merging that PR triggers automatic publishing

### Local Publishing (Alternative)

```bash
# 1. Add changeset
pnpm changeset

# 2. Update version
pnpm changeset version

# 3. Build and publish
pnpm release

# 4. Push code
git push origin main --follow-tags
```

## 🏷️ Version Standards

Follows Semantic Versioning:

| Type      | Version Change | Use Cases                               |
| --------- | -------------- | --------------------------------------- |
| **patch** | x.x.1          | Bug fixes, docs updates, dep updates   |
| **minor** | x.1.0          | New features, backward-compatible improvements |
| **major** | 1.0.0          | Breaking changes, architecture changes, API changes |

## 🔧 Configuration Requirements

### GitHub Secrets

Configure in repository settings:

- `NPM_TOKEN`: npm publish token
  1. Visit https://www.npmjs.com/settings/[username]/tokens
  2. Create "Automation" type token
  3. Add to GitHub Secrets

### Permission Settings

Ensure GitHub Actions has the following permissions:

- `contents: write` - Create releases
- `pull-requests: write` - Create PRs
- `id-token: write` - npm provenance

## 📋 CI/CD Workflows

### CI Workflow (ci.yml)

- **Trigger**: Push to main or PR
- **Test Matrix**:
  - OS: Ubuntu, macOS, Windows
  - Node: 18, 20
- **Steps**: Dependency installation → Type check → Build → Test

### Release Workflow (release.yml)

- **Trigger**: Push to main
- **Features**:
  - Detect changesets
  - Create version PR
  - Auto-publish to npm
  - Support npm provenance

## 💡 Best Practices

1. **One changeset per PR**: Ensure each feature has a change record
2. **Clear descriptions**: Changeset descriptions will appear in CHANGELOG
3. **Choose correct version type**: Reference version standards
4. **Don't manually modify version numbers**: Let changesets manage versions

## 🔍 Common Issues

### Q: What if I forgot to add a changeset?

A: You can add it in the PR by running `pnpm changeset` and committing

### Q: How to publish pre-release versions?

A: Use `pnpm changeset pre enter <tag>` to enter pre-release mode

### Q: How to revoke a publish?

A: npm doesn't support revocation, only publish new version to fix

## 📚 Related Links

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [npm Publish Documentation](https://docs.npmjs.com/cli/v8/commands/npm-publish)
