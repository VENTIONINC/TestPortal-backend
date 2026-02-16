Result 1: entry points

Checked:

- [index.ts](index.ts#L1-L53)
- [src/routes/index.ts](src/routes/index.ts#L1-L42)
- [src/middleware/error-handler.ts](src/middleware/error-handler.ts#L1-L32)
- [src/mcp/server.ts](src/mcp/server.ts#L223-L274)

Findings:

- Global error handler exists and is registered after all routes. [index.ts](index.ts#L45-L47)
- Error handler logs and returns structured error response. [src/middleware/error-handler.ts](src/middleware/error-handler.ts#L10-L31)
- Router aggregates all API modules, including MCP. [src/routes/index.ts](src/routes/index.ts#L25-L40)
- MCP POST handler has local try/catch; GET/DELETE `handleSessionRequest` has no try/catch (relies on async error propagation). [src/mcp/server.ts](src/mcp/server.ts#L255-L269)
	- Status: Fixed (wrapped + `next` forwarding). [src/mcp/server.ts](src/mcp/server.ts)
- No explicit 404 handler observed in entrypoint (optional; not an error, but inconsistent error format).
