import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_IGNORED_DIRECTORIES,
  getHeaderForExtension,
  getSupportedExtensions,
  hasLicenseHeader,
  normalizeHeader,
} from "./license-header-utils.js";

function walkDirectory(directoryPath, collectedPaths) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      if (DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) {
        return;
      }

      walkDirectory(path.join(directoryPath, entry.name), collectedPaths);
      return;
    }

    const absolutePath = path.join(directoryPath, entry.name);
    if (getHeaderForExtension(absolutePath)) {
      collectedPaths.push(absolutePath);
    }
  });
}

const rootDirectory = process.cwd();
const targetFiles = [];

walkDirectory(rootDirectory, targetFiles);

let updatedCount = 0;
let skippedCount = 0;

targetFiles.forEach((targetFile) => {
  const header = getHeaderForExtension(targetFile);

  if (!header) {
    skippedCount += 1;
    return;
  }

  const currentContent = fs.readFileSync(targetFile, "utf8");

  if (hasLicenseHeader(currentContent, header)) {
    skippedCount += 1;
    return;
  }

  fs.writeFileSync(targetFile, `${normalizeHeader(header)}${currentContent}`, "utf8");
  updatedCount += 1;
  console.log(`Updated ${path.relative(rootDirectory, targetFile)}`);
});

console.log(
  `Processed ${targetFiles.length} supported files. Added headers to ${updatedCount}; skipped ${skippedCount}.`,
);
console.log(`Supported extensions: ${getSupportedExtensions().join(", ")}`);
