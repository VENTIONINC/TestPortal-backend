// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";

import dotenv from "dotenv";

try {
  const envPath = new URL("../.env", import.meta.url);
  const { YT_TOKEN } = dotenv.parse(fs.readFileSync(envPath));
  const token = YT_TOKEN?.trim();

  if (!token || /[\r\n]/.test(token)) {
    throw new Error("Invalid token");
  }

  process.stdout.write(JSON.stringify({ Authorization: `Bearer ${token}` }));
} catch {
  console.error("Cannot load YouTrack credentials. Set a valid YT_TOKEN in the project .env file.");
  process.exitCode = 1;
}
