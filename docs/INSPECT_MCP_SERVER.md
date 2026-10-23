# How to Inspect the MCP Server

This document outlines the steps to inspect the MCP server with the local MCP inspector or another MCP-compatible client.

## MCP beta endpoint

The parallel modern-only endpoint is `http://localhost:3001/api/v2/mcp-beta`. It accepts MCP revision `2026-07-28` and rejects legacy initialization. Set `MCP_BETA_ALLOWED_ORIGINS` to a comma-separated list of exact HTTP(S) origins before starting the backend. For the local Inspector UI, include the browser origin shown in its address bar (commonly `http://localhost:6274`). Do not include a path or wildcard. An empty setting allows authenticated native clients without an `Origin` header and rejects browser requests that send one. The beta route uses the existing `MCP_SECRET` bearer credential.

The project installs MCP Inspector `2.12.0` as a development dependency. Run `npm run inspector` for `/api/v2/mcp` or `npm run inspector:beta` for the modern beta endpoint. In the web UI, select the Streamable HTTP transport, enter the beta endpoint, set Protocol Era to **modern**, and configure the existing MCP bearer token as an Authorization header. Verify `server/discover`, `tools/list`, and the harmless `check-status` call; the beta route does not issue a session ID.

For a terminal smoke check with no protocol fallback, use the pinned Inspector CLI:

```bash
./node_modules/.bin/mcp-inspector --cli \
  http://localhost:3001/api/v2/mcp-beta --transport http \
  --protocol-era modern --header "Authorization: Bearer $MCP_BETA_TEST_TOKEN" \
  --method tools/list

./node_modules/.bin/mcp-inspector --cli \
  http://localhost:3001/api/v2/mcp-beta --transport http \
  --protocol-era modern --header "Authorization: Bearer $MCP_BETA_TEST_TOKEN" \
  --method tools/call --tool-name check-status --tool-args-json '{}'
```

Use a short-lived test token in `MCP_BETA_TEST_TOKEN`. A passing smoke check shows modern discovery followed by a successful `check-status` result. Keep Inspector traffic free of production data.

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
   the response text is JSON with page 1, limit 30, and lightweight summary
   records containing `details` and a `createdBy` object with only `id`, `name`,
   and `email`; summaries must not contain Markdown or other User fields.
4. Invoke the detail tool with the same project and a scenario UUID. Verify
   the response contains structured fields, ordered steps, generated Markdown,
   `contentMdHash`, `contentMdFormatVersion`, and separate `resultEvidence`
   and `issueEvidence` pagination envelopes.
5. For a disposable scenario, invoke the update tool with a structured title or
   body field. Verify text is trimmed, `null` clears nullable fields, and
   omitted fields are preserved. `contentMd` and `steps` must be rejected.
   Then invoke the delete tool and verify its explicit `deleted: true`
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
