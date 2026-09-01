# How to Inspect the MCP Server

This document outlines the steps to inspect the MCP server with the local MCP inspector or another MCP-compatible client.

## Prerequisites

Ensure you have the project set up and all dependencies installed.
Build and start the production server before launching the inspector:

```bash
npm run build
npm run server
```

## Steps

1.  **Start the Inspector:**

    Open your terminal and run the following command in the root directory of the project to start the inspector client:

    ```bash
    npm run inspector
    ```

    This command will start the inspector UI preconfigured for the local Streamable HTTP MCP endpoint.

2.  **Configure the Connection:**

    Once the inspector client is running and available on the 6274 port, you will need to configure it to connect to the MCP server.
    Use the following address for the connection:

    `http://localhost:3001/api/v2/mcp`

3.  **Inspect:**

    After successful connection, you should be able to see the MCP server's tools, ongoing sessions, and other relevant information, allowing you to inspect its behavior.

### Test Scenario Inspector Checks

After connecting with a valid MCP bearer token:

1. Open the tool list and verify these four tools are present:
   `list-test-scenarios`, `get-test-scenario`, `update-test-scenario`, and
   `delete-test-scenario`.
2. Inspect each input schema and confirm project and scenario identifiers are
   UUIDs. Confirm Result and Issue pagination fields are separate and bounded
   from 1 through 100.
3. Invoke the list tool with a project UUID and no pagination fields. Verify
   the response text is JSON with page 1, limit 30, and summary records that
   do not contain Markdown.
4. Invoke the detail tool with the same project and a scenario UUID. Verify
   the response contains raw Markdown plus separate `resultEvidence` and
   `issueEvidence` pagination envelopes.
5. For a disposable scenario, invoke the update tool with a title or Markdown
   field, then invoke the delete tool and verify its explicit `deleted: true`
   acknowledgement. Cross-project IDs should produce a standard MCP error.

The tool-call JSON-RPC shape used by inspector-compatible clients is:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list-test-scenarios",
    "arguments": {
      "projectId": "11111111-1111-1111-1111-111111111111",
      "page": 1,
      "limit": 30
    }
  }
}
```

Replace the tool name and arguments to inspect detail, update, and delete
operations. Do not use a production scenario for mutation checks.

## Connecting from an MCP Client

To connect from another MCP-compatible client, configure an HTTP remote server that points at the backend MCP endpoint.

### Configuration Steps

1.  **Add MCP Server Configuration:**

    Add a remote MCP server entry using your client's supported configuration format:

    ```json
    {
      "mcpServers": {
        "test-portal": {
          "command": "npx",
          "args": [
            "mcp-remote",
            "http://localhost:3001/api/v2/mcp"
          ]
        }
      }
    }
    ```

2.  **Restart or Reload the Client:**

    After saving the configuration, restart or reload the MCP client so it discovers the server.

3.  **Verify Connection:**

    Verify the `test-portal` MCP server appears in the client's available tools or by attempting to use an MCP tool like `check-status`.

### Notes

- Ensure the test-portal backend server is running on `http://localhost:3001` before attempting to connect from a client.
- The `mcp-remote` package must be available globally via npm or the configuration may fail.
- If you encounter connection issues, check the MCP client logs for error messages.
