// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

interface ClosableHandler {
  close(): Promise<void>;
}

export interface HandlerRegistry<THandler extends ClosableHandler> {
  track(handler: THandler): () => Promise<void>;
  run<T>(handler: THandler, operation: () => Promise<T>): Promise<T>;
  closeAll(): Promise<void>;
}

/** Tracks request-scoped handlers so a process shutdown can close active streams. */
export const createHandlerRegistry = <THandler extends ClosableHandler>(): HandlerRegistry<THandler> => {
  const closeHandlers = new Set<() => Promise<void>>();

  return {
    track(handler) {
      let closePromise: Promise<void> | undefined;
      const close = (): Promise<void> => {
        closePromise ??= Promise.resolve()
          .then(() => handler.close())
          .finally(() => closeHandlers.delete(close));
        return closePromise;
      };
      closeHandlers.add(close);
      return close;
    },
    async run(handler, operation) {
      const close = this.track(handler);
      try {
        return await operation();
      } finally {
        await close();
      }
    },
    async closeAll() {
      await Promise.allSettled([...closeHandlers].map((close) => close()));
    },
  };
};
