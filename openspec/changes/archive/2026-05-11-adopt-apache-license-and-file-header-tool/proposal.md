## Why

The repository currently has inconsistent licensing metadata: `package.json` still declares `ISC`, the README has a license placeholder, and there is no root `LICENSE` file. We also want a simple, repeatable way to create new files with the required copyright and SPDX header so future source files stay consistent without relying on memory.

## What Changes

- Adopt Apache 2.0 as the repository's declared license and add the standard license text to the repo.
- Update repository metadata and documentation so contributors can clearly see the active license and contribution expectations.
- Add a lightweight `npm run new:file` command that creates a file with a predefined license header.
- Standardize the header content for newly created source files as:
  - `// Copyright 2026 Vention`
  - `// SPDX-License-Identifier: Apache-2.0`
- Add guidance describing when the headered file-creation flow should be used and how contributions are accepted under the project license.

## Capabilities

### New Capabilities
- `repository-licensing`: Defines how the repository declares, documents, and distributes its Apache 2.0 licensing information.
- `file-header-scaffolding`: Defines the `npm run new:file` workflow for creating files with the required Apache 2.0 header.
- `contribution-guidance`: Defines the minimum contributor guidance needed to align new contributions with the repository's license and file-header policy.

### Modified Capabilities

None.

## Impact

- Affected files include `package.json`, `package-lock.json`, `README.md`, a new root `LICENSE` file, a new contributor-facing guide, and a new script or utility used by `npm run new:file`.
- The change affects repository governance and developer workflow, but does not change runtime API behavior.
- The new command will become part of the expected developer workflow for creating new source files.
