// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type {
  SkillFrontmatter,
  StoredSkillPackageFile,
} from "@/types/skills";

const SUPPORTED_FILE_CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".markdown": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
};

export const MAX_SKILL_PACKAGE_FILES = 64;
export const MAX_SKILL_PACKAGE_FILE_BYTES = 64 * 1024;
export const MAX_SKILL_PACKAGE_TOTAL_BYTES = 256 * 1024;
export const SKILL_ARTIFACT_PATH = "SKILL.md";

export interface SkillPackageInputFile {
  path: string;
  content: Buffer;
}

export interface ValidateSkillPackageOptions {
  expectedSkillName?: string;
}

export interface ValidatedSkillPackage {
  frontmatter: SkillFrontmatter;
  skillMarkdown: string;
  packageHash: string;
  files: StoredSkillPackageFile[];
}

export class SkillPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillPackageValidationError";
  }
}

export async function readSkillPackageDirectory(
  directory: string,
): Promise<SkillPackageInputFile[]> {
  const filePaths = await listPackageFiles(directory);

  return await Promise.all(
    filePaths.map(async (filePath) => ({
      path: path.relative(directory, filePath),
      content: await readFile(filePath),
    })),
  );
}

export function validateSkillPackage(
  inputFiles: SkillPackageInputFile[],
  options: ValidateSkillPackageOptions = {},
): ValidatedSkillPackage {
  if (inputFiles.length === 0) {
    throw new SkillPackageValidationError("Skill package is empty");
  }

  if (inputFiles.length > MAX_SKILL_PACKAGE_FILES) {
    throw new SkillPackageValidationError(
      `Skill package exceeds the ${MAX_SKILL_PACKAGE_FILES} file limit`,
    );
  }

  const normalizedFiles = inputFiles
    .map((file) => validatePackageFile(file))
    .sort((left, right) => left.path.localeCompare(right.path));

  const duplicatePaths = findDuplicatePaths(normalizedFiles.map((file) => file.path));
  if (duplicatePaths.length > 0) {
    throw new SkillPackageValidationError(
      `Skill package contains duplicate files after normalization: ${duplicatePaths.join(", ")}`,
    );
  }

  const totalBytes = normalizedFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_SKILL_PACKAGE_TOTAL_BYTES) {
    throw new SkillPackageValidationError(
      `Skill package exceeds the ${MAX_SKILL_PACKAGE_TOTAL_BYTES} byte limit`,
    );
  }

  const skillArtifact = normalizedFiles.find(
    (file) => file.path === SKILL_ARTIFACT_PATH,
  );

  if (!skillArtifact) {
    throw new SkillPackageValidationError("Skill package is missing SKILL.md");
  }

  const skillMarkdown = skillArtifact.content.toString("utf8");
  const frontmatter = parseSkillFrontmatter(
    skillMarkdown,
    options.expectedSkillName,
  );
  const packageHash = createPackageHash(normalizedFiles);

  return {
    frontmatter,
    skillMarkdown,
    packageHash,
    files: normalizedFiles,
  };
}

function validatePackageFile(file: SkillPackageInputFile): StoredSkillPackageFile {
  const normalizedPath = normalizeSkillPackagePath(file.path);
  const extension = path.posix.extname(normalizedPath).toLowerCase();
  const contentType = SUPPORTED_FILE_CONTENT_TYPES[extension];

  if (!contentType) {
    throw new SkillPackageValidationError(
      `Skill package contains unsupported file type for '${normalizedPath}'`,
    );
  }

  if (file.content.length > MAX_SKILL_PACKAGE_FILE_BYTES) {
    throw new SkillPackageValidationError(
      `Skill package file '${normalizedPath}' exceeds the ${MAX_SKILL_PACKAGE_FILE_BYTES} byte limit`,
    );
  }

  return {
    path: normalizedPath,
    content: file.content,
    contentType,
    size: file.content.length,
  };
}

export function normalizeSkillPackagePath(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new SkillPackageValidationError("Skill package file path cannot be empty");
  }

  const slashNormalizedValue = trimmedValue.replace(/\\/g, "/");

  if (slashNormalizedValue.includes("\0")) {
    throw new SkillPackageValidationError("Skill package file path cannot contain NUL bytes");
  }

  if (
    path.posix.isAbsolute(slashNormalizedValue) ||
    /^[A-Za-z]:\//.test(slashNormalizedValue)
  ) {
    throw new SkillPackageValidationError(
      `Skill package file path '${value}' must be relative`,
    );
  }

  const normalizedPath = path.posix.normalize(slashNormalizedValue);

  if (
    normalizedPath === "." ||
    normalizedPath === "" ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../")
  ) {
    throw new SkillPackageValidationError(
      `Skill package file path '${value}' escapes the package root`,
    );
  }

  return normalizedPath;
}

export function parseSkillFrontmatter(
  content: string,
  expectedSkillName?: string,
): SkillFrontmatter {
  if (!content.startsWith("---\n")) {
    throw new SkillPackageValidationError("Skill artifact is missing frontmatter");
  }

  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new SkillPackageValidationError(
      "Skill artifact has malformed frontmatter",
    );
  }

  const frontmatter = parseYamlSubset(content.slice(4, closingIndex));
  const markdownBody = content.slice(closingIndex + 4).trim();

  if (expectedSkillName && frontmatter.name !== expectedSkillName) {
    throw new SkillPackageValidationError(
      `Skill artifact frontmatter name '${frontmatter.name}' does not match '${expectedSkillName}'`,
    );
  }

  if (!frontmatter.name) {
    throw new SkillPackageValidationError(
      "Skill artifact frontmatter is missing a name",
    );
  }

  if (!frontmatter.description) {
    throw new SkillPackageValidationError(
      "Skill artifact frontmatter is missing a description",
    );
  }

  if (!markdownBody) {
    throw new SkillPackageValidationError(
      "Skill artifact must contain a non-empty Markdown body",
    );
  }

  return frontmatter;
}

function parseYamlSubset(source: string): SkillFrontmatter {
  const parsed: SkillFrontmatter = {
    name: "",
    description: "",
  };
  let currentObjectKey: "metadata" | null = null;

  source.split("\n").forEach((line) => {
    if (!line.trim()) {
      return;
    }

    const nestedMatch = line.match(/^ {2}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nestedMatch && currentObjectKey === "metadata") {
      const key = nestedMatch[1];
      const value = nestedMatch[2] ?? "";

      if (!key) {
        throw new SkillPackageValidationError(
          "Skill artifact contains unsupported frontmatter",
        );
      }

      parsed.metadata ??= {};
      parsed.metadata[key] = parseScalar(value);
      return;
    }

    const topLevelMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!topLevelMatch) {
      throw new SkillPackageValidationError(
        "Skill artifact contains unsupported frontmatter",
      );
    }

    const key = topLevelMatch[1];
    const value = topLevelMatch[2] ?? "";

    if (!key) {
      throw new SkillPackageValidationError(
        "Skill artifact contains unsupported frontmatter",
      );
    }

    currentObjectKey = null;

    if (key === "metadata" && value === "") {
      parsed.metadata = {};
      currentObjectKey = "metadata";
      return;
    }

    if (key === "name") {
      parsed.name = parseScalar(value);
      return;
    }

    if (key === "description") {
      parsed.description = parseScalar(value);
      return;
    }

    if (key === "license") {
      parsed.license = parseScalar(value);
      return;
    }

    if (key === "compatibility") {
      parsed.compatibility = parseScalar(value);
    }
  });

  return parsed;
}

function parseScalar(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

async function listPackageFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return await listPackageFiles(entryPath);
      }

      if (entry.isFile()) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

function createPackageHash(files: StoredSkillPackageFile[]): string {
  const hash = createHash("sha256");

  files.forEach((file) => {
    hash.update(file.path, "utf8");
    hash.update("\0", "utf8");
    hash.update(file.content);
    hash.update("\0", "utf8");
  });

  return hash.digest("hex");
}

function findDuplicatePaths(paths: string[]): string[] {
  const duplicates = new Set<string>();
  const seen = new Set<string>();

  paths.forEach((filePath) => {
    if (seen.has(filePath)) {
      duplicates.add(filePath);
      return;
    }

    seen.add(filePath);
  });

  return [...duplicates].sort((left, right) => left.localeCompare(right));
}
