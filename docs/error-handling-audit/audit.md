Audit plan: unhandled errors

Version note: Audit executed against production v0.5.1. Results may be stale for v0.5.2+.

1. Entry points: server bootstrap, router registration, middleware chain, global error handler ordering.
2. Controllers: ensure `try/catch`, validate inputs, status codes, no fallthrough.
3. Services: await external calls, throw on invalid states, no swallowed errors.
4. Models/Prisma: null checks, not-found errors, transaction error propagation.
5. Middleware: auth/validation/file upload errors propagate to handler.
6. MCP tools/handlers: Zod validation, tool execution error mapping.
7. Lib/utils: parsing, file I/O, network, crypto errors surfaced.
8. Tests: ensure negative-path coverage for each layer.
