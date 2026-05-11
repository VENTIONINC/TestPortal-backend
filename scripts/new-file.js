import fs from "node:fs";
import path from "node:path";

const HEADER_BY_EXTENSION = new Map([
  [".ts", "// Copyright 2026 Vention\n// SPDX-License-Identifier: Apache-2.0\n"],
  [".tsx", "// Copyright 2026 Vention\n// SPDX-License-Identifier: Apache-2.0\n"],
  [".js", "// Copyright 2026 Vention\n// SPDX-License-Identifier: Apache-2.0\n"],
  [".jsx", "// Copyright 2026 Vention\n// SPDX-License-Identifier: Apache-2.0\n"],
  [".mjs", "// Copyright 2026 Vention\n// SPDX-License-Identifier: Apache-2.0\n"],
  [".cjs", "// Copyright 2026 Vention\n// SPDX-License-Identifier: Apache-2.0\n"],
]);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const targetArg = process.argv[2];

if (!targetArg) {
  fail("Usage: npm run new:file -- <path>");
}

const targetPath = path.resolve(process.cwd(), targetArg);
const extension = path.extname(targetPath).toLowerCase();
const header = HEADER_BY_EXTENSION.get(extension);

if (!header) {
  const supportedExtensions = Array.from(HEADER_BY_EXTENSION.keys()).join(", ");
  fail(
    `Unsupported extension '${extension || "(none)"}'. Supported extensions: ${supportedExtensions}`,
  );
}

if (fs.existsSync(targetPath)) {
  fail(`File already exists: ${targetArg}`);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, `${header}\n`, "utf8");

console.log(`Created ${path.relative(process.cwd(), targetPath)}`);
