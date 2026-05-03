# Release Guide

This document describes the recommended release flow for the Test Portal Backend.

## Recommended Flow

1. Update the version in `package.json` on a feature or release branch.
2. Open a pull request targeting `main`.
3. Make sure the pull request passes the required checks:
   - `npm run type-check`
   - `npm run lint`
   - `npm run build`
4. Merge the pull request into `main`.
5. Pull the latest `main` locally and confirm you are on the exact merged commit.
6. Create a Git tag for the new version on that `main` commit.
7. Push the tag to GitHub.
8. Create a GitHub Release from that tag.

## Example

If the new version is `0.10.2`:

```bash
git checkout main
git pull origin main
git tag v0.10.2
git push origin v0.10.2
```

Then create a new GitHub Release for `v0.10.2` in the repository UI.

## Why This Flow Works

This is a normal and widely used workflow.

It follows a few good release practices:

- The version change is reviewed in a pull request before release.
- The release tag is created from the actual commit that reached `main`.
- GitHub Releases are tied to immutable Git tags instead of branch state.

## Best Practice Notes

- Prefer tagging the merge commit on `main`, not the PR branch commit before merge. This ensures the tag points to the exact code that was released.
- Use a consistent tag format. `vX.Y.Z` is the most common choice and works well with release tooling.
- Keep `package.json` version and Git tag aligned. Example: `package.json` = `0.10.2`, tag = `v0.10.2`.
- If release notes matter to your team or customers, add a short summary of changes in the GitHub Release.

## Docker Workflow Relation

This repository also has a manual Docker publishing workflow:

- [Docker Deployment Guide](./DOCKER.md)
- [GitHub workflow](../.github/workflows/publish-docker.yml)

That workflow can derive semver-style Docker image tags from Git tags, so creating a proper release tag is useful even when the image build is triggered manually.
