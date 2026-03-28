# Release Agent Skill

This skill provides a structured workflow for creating new releases in the TimeTracker project using semantic versioning and GitHub Releases.

## Workflow Overview

```
1. Pre-flight Checks
   - Verify on main branch
   - Verify clean working directory
   - Check for existing tags

2. Version Calculation
   - Get latest release tag
   - Determine next version (patch/minor/major)
   - Default to patch if no previous release

3. Release Notes Generation
   - Get commits since last release
   - Get merged PRs since last release
   - Format into structured notes

4. Release Creation
   - Create git tag
   - Push tag to remote
   - Create GitHub release with notes
```

## Trigger

When user requests a new release, the agent should:
1. Acknowledge the request
2. Run pre-flight checks
3. Guide through version selection
4. Generate release notes
5. Create and push the release

## Phase 1: Pre-flight Checks

**Goal:** Ensure the repository is in a valid state for release.

### Check 1: Current Branch

```bash
git branch --show-current
```

**Expected:** `main`

**If not main:**
- Abort with error: "Cannot create release from branch '{branch}'. Must be on 'main' branch."
- Suggest: "Please switch to main branch: `git checkout main`"

### Check 2: Clean Working Directory

```bash
git status --porcelain
```

**Expected:** Empty output (no changes)

**If dirty:**
- Abort with error: "Working directory is not clean. Please commit or stash changes before creating a release."
- Show modified files: `git status`

### Check 3: Remote Sync

```bash
git fetch origin
git status -b --porcelain
```

**Expected:** Branch is up to date with origin/main

**If behind:**
- Warn: "Local main is behind origin/main. Consider pulling latest changes first."
- Ask user if they want to proceed anyway

### Check 4: No Existing Tag for Next Version

After calculating the next version (Phase 2), verify the tag doesn't exist:

```bash
git tag -l "v{version}"
```

**If tag exists:**
- Abort with error: "Tag v{version} already exists. Please choose a different version."

## Phase 2: Version Calculation

**Goal:** Determine the next version number using semantic versioning.

### Get Latest Release Tag

```bash
git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"
```

**Parse the version:**
```bash
# Extract version components
VERSION=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.0.0")
MAJOR=$(echo $VERSION | cut -d. -f1)
MINOR=$(echo $VERSION | cut -d. -f2)
PATCH=$(echo $VERSION | cut -d. -f3)
```

### Version Bump Types

Ask user which version bump type:
- **patch** (default): Bug fixes, minor changes (v1.2.3 → v1.2.4)
- **minor**: New features, backwards compatible (v1.2.3 → v1.3.0)
- **major**: Breaking changes (v1.2.3 → v2.0.0)

### Calculate New Version

```bash
case $BUMP_TYPE in
  major)
    NEW_MAJOR=$((MAJOR + 1))
    NEW_MINOR=0
    NEW_PATCH=0
    ;;
  minor)
    NEW_MAJOR=$MAJOR
    NEW_MINOR=$((MINOR + 1))
    NEW_PATCH=0
    ;;
  patch)
    NEW_MAJOR=$MAJOR
    NEW_MINOR=$MINOR
    NEW_PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="v${NEW_MAJOR}.${NEW_MINOR}.${NEW_PATCH}"
```

### First Release

If no previous release exists (`v0.0.0`), default to `v0.1.0` for the first release.

## Phase 3: Release Notes Generation

**Goal:** Generate comprehensive release notes from changes since last release.

### Get Commits Since Last Release

```bash
# Get last tag, or use empty tree for first release
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  # First release - get all commits
  git log --pretty=format:"- %s (%h)" --no-merges
else
  # Get commits since last tag
  git log ${LAST_TAG}..HEAD --pretty=format:"- %s (%h)" --no-merges
fi
```

### Get Merged PRs

Use GitHub MCP tool to get merged PRs since last release:
- `github_list_pull_requests` with `state: "closed"` and `base: "main"`
- Filter by merge date (after last tag date)
- Extract PR title and number

### Format Release Notes

Structure the notes as:

```markdown
## What's Changed

### Features
- Feature 1 (#PR_NUMBER)
- Feature 2 (#PR_NUMBER)

### Bug Fixes
- Fix 1 (#PR_NUMBER)
- Fix 2 (#PR_NUMBER)

### Other Changes
- Change 1 (commit_hash)
- Change 2 (commit_hash)

**Full Changelog**: {compare_url}
```

**Compare URL format:**
```
https://github.com/simonfranken/timetracker/compare/{last_tag}...{new_version}
```

### First Release Notes

For the first release, format as:

```markdown
## Initial Release

This is the first release of TimeTracker!

### What's Included
- List of main features
- Backend API
- Frontend React SPA
- Helm chart for Kubernetes deployment

**Full Commit History**: {commit_url}
```

## Phase 4: Release Creation

**Goal:** Create the git tag, push it, and create a GitHub release.

### Step 1: Create Git Tag

```bash
git tag -a "v{version}" -m "Release v{version}"
```

### Step 2: Push Tag to Remote

```bash
git push origin "v{version}"
```

**If push fails:**
- Show error message
- Suggest checking remote access
- Allow retry

### Step 3: Create GitHub Release

Use `github_create_release` tool:

```json
{
  "tag_name": "v{version}",
  "name": "v{version}",
  "body": "{generated_release_notes}",
  "draft": false,
  "prerelease": false
}
```

### Step 4: Verify Release

```bash
# Verify tag exists locally
git tag -l "v{version}"

# Verify tag exists on remote
git ls-remote --tags origin | grep "v{version}"
```

## Error Handling

| Error | Handling |
|-------|----------|
| Not on main branch | Abort with clear message |
| Dirty working directory | Abort, show modified files |
| Tag already exists | Abort, suggest different version |
| Network error pushing tag | Show error, allow retry |
| GitHub API error | Show error, allow retry |
| No commits since last release | Warn user, ask if they want to proceed |

## Quick Reference

### Commands

- Check current branch: `git branch --show-current`
- Check working directory: `git status --porcelain`
- Get latest tag: `git describe --tags --abbrev=0`
- List tags: `git tag -l`
- Create tag: `git tag -a "v{version}" -m "Release v{version}"`
- Push tag: `git push origin "v{version}"`

### GitHub Tools

- `github_list_pull_requests` — Get merged PRs for release notes
- `github_create_release` — Create GitHub release with notes

### Version Format

- Semantic versioning: `MAJOR.MINOR.PATCH`
- Tag format: `v{MAJOR}.{MINOR}.{PATCH}`
- Example: `v1.2.3`

### Release Notes Structure

```markdown
## What's Changed

### Features
- Feature description (#PR_NUMBER)

### Bug Fixes
- Fix description (#PR_NUMBER)

### Other Changes
- Change description (commit_hash)

**Full Changelog**: {compare_url}
```

## Example Flow

```
User: "Create a new release"

Agent: "I'll help you create a new release. Let me check the current state..."

[Runs pre-flight checks]

Agent: "✓ On main branch
✓ Working directory is clean
✓ Remote is up to date

The last release was v1.2.3. What type of release is this?
- patch (bug fixes): v1.2.4
- minor (new features): v1.3.0
- major (breaking changes): v2.0.0"

User: "minor"

Agent: "Creating release v1.3.0. Let me generate release notes..."

[Generates release notes]

Agent: "Release notes ready:

## What's Changed

### Features
- Add CSV export functionality (#42)
- Implement dark mode toggle (#45)

### Bug Fixes
- Fix timer not stopping on logout (#43)

### Other Changes
- Update dependencies (abc1234)

**Full Changelog**: https://github.com/simonfranken/timetracker/compare/v1.2.3...v1.3.0

Shall I create the release?"

User: "yes"

Agent: "Creating release v1.3.0..."
[Creates tag, pushes, creates GitHub release]

Agent: "✓ Created tag v1.3.0
✓ Pushed tag to origin
✓ Created GitHub release v1.3.0

Release complete! View it at: https://github.com/simonfranken/timetracker/releases/tag/v1.3.0"
```
