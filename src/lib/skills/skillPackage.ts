// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { crc32 } from "node:zlib";

import JSZip, { type JSZipObject } from "jszip";

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
export const MAX_SKILL_NAME_LENGTH = 64;

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export async function readSkillPackageZip(
  zipBuffer: Buffer,
): Promise<SkillPackageInputFile[]> {
  if (zipBuffer.length === 0) {
    throw new SkillPackageValidationError("Skill package zip is empty");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    throw new SkillPackageValidationError("Skill package zip is malformed");
  }

  const entries = Object.values(zip.files);
  const fileEntries = entries.filter((entry) => !entry.dir);

  if (fileEntries.length === 0) {
    throw new SkillPackageValidationError("Skill package zip contains no files");
  }

  if (fileEntries.length > MAX_SKILL_PACKAGE_FILES) {
    throw new SkillPackageValidationError(
      `Skill package exceeds the ${MAX_SKILL_PACKAGE_FILES} file limit`,
    );
  }

  entries.forEach(validateZipEntryPath);
  validateZipEntryTypes(entries, fileEntries);
  validateDeclaredZipEntrySizes(fileEntries);

  const normalizedInputPaths = normalizeZipPackageRoot(
    fileEntries.map((entry) => getZipEntryOriginalPath(entry)),
  );
  const duplicatePaths = findDuplicatePaths(normalizedInputPaths);

  if (duplicatePaths.length > 0) {
    throw new SkillPackageValidationError(
      `Skill package contains duplicate files after normalization: ${duplicatePaths.join(", ")}`,
    );
  }

  const extractedFiles: SkillPackageInputFile[] = [];
  let extractedTotalBytes = 0;

  for (const [index, entry] of fileEntries.entries()) {
    let content: Buffer;
    try {
      content = await extractBoundedZipEntry(entry, (chunkBytes) => {
        if (extractedTotalBytes + chunkBytes > MAX_SKILL_PACKAGE_TOTAL_BYTES) {
          throw new SkillPackageValidationError(
            `Skill package exceeds the ${MAX_SKILL_PACKAGE_TOTAL_BYTES} byte limit during extraction`,
          );
        }
        extractedTotalBytes += chunkBytes;
      });
    } catch (error) {
      if (error instanceof SkillPackageValidationError) {
        throw error;
      }
      throw new SkillPackageValidationError(
        `Skill package zip entry '${getZipEntryOriginalPath(entry)}' is malformed`,
      );
    }

    extractedFiles.push({
      path: normalizedInputPaths[index] as string,
      content,
    });
  }

  return extractedFiles;
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

  validateSkillName(frontmatter.name);

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

export function validateSkillName(name: string): void {
  if (
    name.length > MAX_SKILL_NAME_LENGTH ||
    !SKILL_NAME_PATTERN.test(name)
  ) {
    throw new SkillPackageValidationError(
      `Skill artifact frontmatter name must be a lowercase slug of at most ${MAX_SKILL_NAME_LENGTH} characters`,
    );
  }
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

function getZipEntryOriginalPath(entry: JSZipObject): string {
  return entry.unsafeOriginalName ?? entry.name;
}

function validateZipEntryPath(entry: JSZipObject): void {
  const originalPath = getZipEntryOriginalPath(entry);
  const pathWithoutDirectorySuffix = entry.dir
    ? originalPath.replace(/[\\/]+$/, "")
    : originalPath;

  normalizeSkillPackagePath(pathWithoutDirectorySuffix);
}

function validateZipEntryTypes(
  entries: JSZipObject[],
  fileEntries: JSZipObject[],
): void {
  const normalizedFilePaths = fileEntries.map((entry) =>
    normalizeSkillPackagePath(getZipEntryOriginalPath(entry)),
  );

  entries.forEach((entry) => {
    const unixFileType =
      typeof entry.unixPermissions === "number"
        ? entry.unixPermissions & 0o170000
        : 0;

    if (!entry.dir && unixFileType !== 0 && unixFileType !== 0o100000) {
      throw new SkillPackageValidationError(
        `Skill package zip entry '${getZipEntryOriginalPath(entry)}' is not a regular file`,
      );
    }

    if (!entry.dir) {
      return;
    }

    const directoryPath = normalizeSkillPackagePath(
      getZipEntryOriginalPath(entry).replace(/[\\/]+$/, ""),
    );
    const isUsedDirectory = normalizedFilePaths.some((filePath) =>
      filePath.startsWith(`${directoryPath}/`),
    );

    if (normalizedFilePaths.includes(directoryPath) || !isUsedDirectory) {
      throw new SkillPackageValidationError(
        `Skill package contains unsupported directory entry '${getZipEntryOriginalPath(entry)}'`,
      );
    }
  });
}

function normalizeZipPackageRoot(paths: string[]): string[] {
  const normalizedPaths = paths.map(normalizeSkillPackagePath);

  if (normalizedPaths.includes(SKILL_ARTIFACT_PATH)) {
    return normalizedPaths;
  }

  const firstSegments = new Set(
    normalizedPaths.map((filePath) => filePath.split("/")[0]),
  );

  if (firstSegments.size !== 1) {
    return normalizedPaths;
  }

  const [topLevelFolder] = firstSegments;
  if (!topLevelFolder) {
    return normalizedPaths;
  }

  const prefix = `${topLevelFolder}/`;
  const strippedPaths = normalizedPaths.map((filePath) =>
    filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath,
  );

  return strippedPaths.includes(SKILL_ARTIFACT_PATH)
    ? strippedPaths
    : normalizedPaths;
}

function validateDeclaredZipEntrySizes(entries: JSZipObject[]): void {
  let totalBytes = 0;

  entries.forEach((entry) => {
    const { uncompressedSize } = getDeclaredZipEntryData(entry);

    if (uncompressedSize > MAX_SKILL_PACKAGE_FILE_BYTES) {
      throw new SkillPackageValidationError(
        `Skill package file '${getZipEntryOriginalPath(entry)}' exceeds the ${MAX_SKILL_PACKAGE_FILE_BYTES} byte limit`,
      );
    }

    totalBytes += uncompressedSize;
  });

  if (totalBytes > MAX_SKILL_PACKAGE_TOTAL_BYTES) {
    throw new SkillPackageValidationError(
      `Skill package exceeds the ${MAX_SKILL_PACKAGE_TOTAL_BYTES} byte limit`,
    );
  }
}

interface DeclaredZipEntryData {
  crc32: number;
  uncompressedSize: number;
}

function getDeclaredZipEntryData(entry: JSZipObject): DeclaredZipEntryData {
  const entryData = entry as JSZipObject & {
    _data?: Partial<DeclaredZipEntryData>;
  };
  const { crc32: expectedCrc32, uncompressedSize } = entryData._data ?? {};

  if (
    uncompressedSize === undefined ||
    !Number.isSafeInteger(uncompressedSize) ||
    expectedCrc32 === undefined ||
    !Number.isInteger(expectedCrc32)
  ) {
    throw new SkillPackageValidationError(
      `Skill package zip entry '${getZipEntryOriginalPath(entry)}' has invalid metadata`,
    );
  }

  return { crc32: expectedCrc32, uncompressedSize };
}

async function extractBoundedZipEntry(
  entry: JSZipObject,
  accountForChunk: (chunkBytes: number) => void,
): Promise<Buffer> {
  const declaredData = getDeclaredZipEntryData(entry);
  const stream = entry.nodeStream("nodebuffer") as Readable;
  const chunks: Buffer[] = [];
  let checksum = 0;
  let extractedBytes = 0;

  return await new Promise<Buffer>((resolve, reject) => {
    let extractionFailed = false;

    stream.on("data", (chunk: Buffer) => {
      try {
        extractedBytes += chunk.length;
        if (
          extractedBytes > declaredData.uncompressedSize ||
          extractedBytes > MAX_SKILL_PACKAGE_FILE_BYTES
        ) {
          throw new SkillPackageValidationError(
            `Skill package file '${getZipEntryOriginalPath(entry)}' exceeds its declared or permitted size during extraction`,
          );
        }

        accountForChunk(chunk.length);
        chunks.push(Buffer.from(chunk));
        checksum = crc32(chunk, checksum);
      } catch (error) {
        extractionFailed = true;
        reject(error);
        stream.destroy();
      }
    });
    stream.once("error", reject);
    stream.once("end", () => {
      if (extractionFailed) {
        return;
      }

      if (extractedBytes !== declaredData.uncompressedSize) {
        reject(
          new SkillPackageValidationError(
            `Skill package file '${getZipEntryOriginalPath(entry)}' does not match its declared size`,
          ),
        );
        return;
      }

      if ((checksum >>> 0) !== (declaredData.crc32 >>> 0)) {
        reject(
          new SkillPackageValidationError(
            `Skill package file '${getZipEntryOriginalPath(entry)}' failed CRC validation`,
          ),
        );
        return;
      }

      resolve(Buffer.concat(chunks, extractedBytes));
    });
  });
}
