// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";

const SHUTDOWN_TIMEOUT_MS = 5_000;

const withTimeout = <T>(
  operation: Promise<T>,
  message: () => string,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(message())),
        SHUTDOWN_TIMEOUT_MS,
      );
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
};

describe("application shutdown", () => {
  let child: ChildProcess | undefined;

  afterEach(() => {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
    child = undefined;
  });

  it("exits after SIGTERM when no requests are active", async () => {
    const output: string[] = [];
    child = spawn(process.execPath, ["--import", "tsx", "index.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "0", NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => output.push(chunk.toString()));

    try {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          const checkReady = (chunk: Buffer): void => {
            if (chunk.toString().includes("Running on Port 0")) {
              child?.stdout?.off("data", checkReady);
              resolve();
            }
          };
          child?.stdout?.on("data", checkReady);
          child?.once("error", reject);
          child?.once("exit", (code) =>
            reject(
              new Error(
                `Server exited before listening (${String(code)}): ${output.join("")}`,
              ),
            ),
          );
        }),
        () => `Server did not start: ${output.join("")}`,
      );

      child.kill("SIGTERM");
      const [code, signal] = await withTimeout(
        once(child, "exit") as Promise<[number | null, NodeJS.Signals | null]>,
        () => `Server did not exit after SIGTERM: ${output.join("")}`,
      );

      expect(code).toBe(0);
      expect(signal).toBeNull();
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  });
});
