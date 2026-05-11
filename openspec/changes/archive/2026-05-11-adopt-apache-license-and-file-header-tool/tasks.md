## 1. Repository Licensing Artifacts

- [x] 1.1 Add a root `LICENSE` file containing the standard Apache License 2.0 text
- [x] 1.2 Update `package.json` to declare `Apache-2.0` and refresh lockfile metadata as needed
- [x] 1.3 Replace the README license placeholder with a short Apache 2.0 section pointing to the root `LICENSE` file

## 2. Headered File Creation Command

- [x] 2.1 Add an npm script named `new:file` that invokes a lightweight repository file-creation utility
- [x] 2.2 Implement the file-creation utility to require a target path, create missing parent directories, and refuse to overwrite existing files
- [x] 2.3 Implement supported extension handling so TypeScript and JavaScript-family files receive the required copyright and SPDX header
- [x] 2.4 Define and document how unsupported file extensions are handled by the command
- [x] 2.5 Add a bulk header backfill command for existing supported source files in the repository

## 3. Contribution Guidance

- [x] 3.1 Add a lightweight `CONTRIBUTING.md` that documents validation commands and contribution licensing expectations
- [x] 3.2 Document when contributors should use `npm run new:file -- <path>` for supported new files
- [x] 3.3 Update any top-level documentation references so contributors can easily find the contribution guide

## 4. Validation

- [x] 4.1 Manually verify `npm run new:file -- <path>` succeeds for at least one supported file type
- [x] 4.2 Manually verify `npm run new:file` fails cleanly when the path is missing or already exists
- [x] 4.3 Manually verify the bulk header command updates supported files and skips already-headered or unsupported files
- [ ] 4.4 Run the repository validation commands required by the project before merging
