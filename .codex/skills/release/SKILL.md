---
name: release
description: Run this repository's release workflow when the user asks for /release, a release branch, version bump, release PR prep, or final release tagging.
---

# Release

Use this skill for this repository's release flow. Treat the version and release branches as explicit inputs.

## Required Inputs

Ask for missing values before starting:

- Release version, without `v` unless the user already included it.
- Branches to merge into the release branch, if any.

Normalize:

- Release branch: `release/<version>`
- Tag: `v<version>`

## Prepare Release Branch

1. Confirm the worktree is clean:
   - `git status --short --branch`
2. Switch to `main`:
   - `git switch main`
3. Pull fresh `main`:
   - `git pull --ff-only origin main`
4. Create the release branch:
   - `git switch -c release/<version>`
5. Bump package version without creating an npm tag:
   - `npm version <version> --no-git-tag-version`
6. For each requested release branch, merge it into the release branch:
   - Prefer `git pull origin <branch>` when following the established process.
   - Resolve conflicts only with clear intent; report conflicts if they need product or repository-owner judgment.
7. Inspect changes:
   - `git status --short --branch`
   - `git diff -- package.json package-lock.json`
8. Commit the version bump if it is not already committed by the merge process:
   - `git add package.json package-lock.json`
   - `git commit -m "chore: release <version>"`
9. Push the release branch:
   - `git push -u origin release/<version>`
10. Give the user the PR URL from the push output, or the GitHub compare URL if the remote does not print one.

## Finalize After Merge

Only run this phase after the user confirms the release branch has been merged to `main`.

1. Switch to `main`:
   - `git switch main`
2. Pull fresh `main`:
   - `git pull --ff-only origin main`
3. Verify release state:
   - `node -p "const p=require('./package.json'); p.version"`
   - `git status --short --branch`
   - `git log --oneline --decorate -3`
   - Confirm `package.json` version equals `<version>`.
4. Check whether the tag already exists:
   - `git tag --list 'v<version>'`
5. Create an annotated tag on current `main`:
   - `git tag -a v<version> -m "v<version>"`
6. Push the tag:
   - `git push origin v<version>`
7. Verify:
   - `git show --no-patch --decorate --oneline v<version>`
   - Confirm the tag points to `HEAD` on `main`.

## Output

Report:

- Release branch name and push status.
- Branches merged into the release branch.
- Version bump commit, if created.
- Tag name and the commit it points to, after finalization.
- Any skipped validation or unresolved conflict.
