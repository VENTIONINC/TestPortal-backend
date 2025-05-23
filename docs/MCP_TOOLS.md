# MCP Tools Documentation

This document describes the tools available through the MCP (Model Context Protocol) server. MCP tools are functions or modules that the server can expose to connected clients, allowing them to request specific operations or retrieve specialized data.

Tools are registered with the MCP server instance and can be invoked by clients using MCP requests that specify the tool name and any required parameters.

## Available Tools

### `check-status`

-   **Source File:** `src/mcp/tools/status-check.js`
-   **Description:** This tool is used to check the operational status of the server. It can be used to verify that the server is running and potentially to get information about its internal state or dependencies (e.g., database connectivity).
-   **Parameters:** (To be defined - depends on the specific implementation in `status-check.js`)
-   **Response:** (To be defined - depends on the specific implementation in `status-check.js`)
    -   Typically, a successful response would include a status indicator (e.g., `"status": "ok"`) and potentially other relevant metrics.

---

*This document should be updated as new tools are added or existing tools are modified.* 