# How to Inspect the MCP Server

This document outlines the steps to inspect the MCP server and connect to it from various clients.

## Prerequisites

Ensure you have the project set up and all dependencies installed.

## Steps

1.  **Start the Inspector:**

    Open your terminal and run the following command in the root directory of the project to start the inspector client:

    ```bash
    npm run inspect
    ```

    This command will start a local server or tool that allows you to connect to the MCP server.

2.  **Configure the Connection:**

    Once the inspector client is running and available on the 6274 port, you will need to configure it to connect to the MCP server.
    Use the following address for the connection:

    `http://localhost:3001/api/mcp`

3.  **Inspect:**

    After successful connection, you should be able to see the MCP server's tools, ongoing sessions, and other relevant information, allowing you to inspect its behavior.

## Connecting from Claude Desktop App

To connect to the MCP server from Claude Desktop app, you need to configure the MCP client in your Claude Desktop configuration.

### Configuration Steps

1.  **Locate the Claude Desktop Configuration File:**

    The configuration file is typically located at:
    - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
    - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
    - **Linux:** `~/.config/Claude/claude_desktop_config.json`

2.  **Add MCP Server Configuration:**

    Open the `claude_desktop_config.json` file and add the following configuration under the `mcpServers` section:

    ```json
    {
      "mcpServers": {
        "test-portal": {
          "command": "npx",
          "args": [
            "mcp-remote",
            "http://localhost:3001/api/mcp"
          ]
        }
      }
    }
    ```

3.  **Restart Claude Desktop:**

    After saving the configuration file, restart the Claude Desktop application for the changes to take effect.

4.  **Verify Connection:**

    Once Claude Desktop is restarted, the MCP server should be available. You can verify the connection by checking if the `test-portal` MCP server appears in Claude's available tools or by attempting to use MCP tools like `check-status`.

### Notes

- Ensure the test-portal backend server is running on `http://localhost:3001` before attempting to connect from Claude Desktop.
- The `mcp-remote` package must be available globally via npm or the configuration may fail.
- If you encounter connection issues, check the Claude Desktop logs for error messages.
