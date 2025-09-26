import { Server, type ListenOptions } from 'node:net';

const originalListen = Server.prototype.listen;

if (!(originalListen as unknown as { __patched?: boolean }).__patched) {
  const patchedListen = function (
    this: Server,
    ...args: Parameters<typeof originalListen>
  ) {
    const adjustedArgs = [...args] as unknown[];

    if (
      typeof adjustedArgs[0] === 'number' &&
      !adjustedArgs.some((arg) => typeof arg === 'string')
    ) {
      adjustedArgs.splice(1, 0, '127.0.0.1');
    } else if (
      adjustedArgs[0] &&
      typeof adjustedArgs[0] === 'object' &&
      !Array.isArray(adjustedArgs[0])
    ) {
      const options: ListenOptions = { ...(adjustedArgs[0] as ListenOptions) };
      const hasPath = typeof (options as { path?: unknown }).path === 'string';
      if (!hasPath && options.host === undefined) {
        options.host = '127.0.0.1';
      }
      adjustedArgs[0] = options;
    }

    return originalListen.apply(this, adjustedArgs as Parameters<typeof originalListen>);
  } as typeof originalListen;

  Server.prototype.listen = patchedListen;

  (Server.prototype.listen as unknown as { __patched?: boolean }).__patched = true;
}

export {};
