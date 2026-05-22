# How to Inspect the MCP Server

This document outlines the steps to inspect the MCP server with the local MCP inspector or another MCP-compatible client.

## Prerequisites

Ensure you have the project set up and all dependencies installed.

## Steps

1.  **Start the Inspector:**

    Open your terminal and run the following command in the root directory of the project to start the inspector client:

    ```bash
    npm run inspector
    ```

    This command will start a local server or tool that allows you to connect to the MCP server.

2.  **Configure the Connection:**

    Once the inspector client is running and available on the 6274 port, you will need to configure it to connect to the MCP server.
    Use the following address for the connection:

    `http://localhost:3001/api/v2/mcp`

3.  **Inspect:**

    After successful connection, you should be able to see the MCP server's tools, ongoing sessions, and other relevant information, allowing you to inspect its behavior.

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
