// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createHandlerRegistry } from "@/mcp/beta/handlerRegistry";

describe("MCP beta handler lifecycle registry", () => {
  it.each([
    ["success", async () => "response"],
    ["error", async () => Promise.reject(new Error("request failed"))],
  ])("closes a request handler after %s", async (_outcome, operation) => {
    const registry = createHandlerRegistry<{ close: () => Promise<void> }>();
    const close = jest.fn(async () => undefined);

    if (_outcome === "success") {
      await expect(registry.run({ close }, operation)).resolves.toBe("response");
    } else {
      await expect(registry.run({ close }, operation)).rejects.toThrow(
        "request failed",
      );
    }

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes a request handler when its HTTP stream is disconnected", async () => {
    const registry = createHandlerRegistry<{ close: () => Promise<void> }>();
    const close = jest.fn(async () => undefined);
    const controller = new AbortController();
    const disconnected = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(new Error("disconnected")));
    });
    const request = registry.run({ close }, () => disconnected);
    controller.abort();

    await expect(request).rejects.toThrow("disconnected");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes active request handlers once during shutdown and permits completed handlers to leave", async () => {
    const registry = createHandlerRegistry<{ close: () => Promise<void> }>();
    const firstClose = jest.fn(async () => undefined);
    const secondClose = jest.fn(async () => undefined);
    const completeFirst = registry.track({ close: firstClose });
    registry.track({ close: secondClose });

    await completeFirst();
    await registry.closeAll();
    await registry.closeAll();

    expect(firstClose).toHaveBeenCalledTimes(1);
    expect(secondClose).toHaveBeenCalledTimes(1);
  });

  it("closes every active handler even if one close operation rejects", async () => {
    const registry = createHandlerRegistry<{ close: () => Promise<void> }>();
    const failedClose = jest.fn(async () => {
      throw new Error("close failed");
    });
    const healthyClose = jest.fn(async () => undefined);
    registry.track({ close: failedClose });
    registry.track({ close: healthyClose });

    await expect(registry.closeAll()).resolves.toBeUndefined();
    expect(failedClose).toHaveBeenCalledTimes(1);
    expect(healthyClose).toHaveBeenCalledTimes(1);
  });
});
