/**
 * Simple test script to verify MCP prompts are working
 */

async function testMcpPrompts() {
  try {
    // Test the MCP server endpoint with prompts/list request
    const response = await fetch('http://localhost:3001/api/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Using a test token
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {
            roots: {
              listChanged: false
            },
            sampling: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    const result = await response.json();
    console.log('Initialize response:', JSON.stringify(result, null, 2));

    // Test prompts/list
    const promptsResponse = await fetch('http://localhost:3001/api/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
        'mcp-session-id': result.result?.sessionId || 'test-session'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'prompts/list'
      })
    });

    const promptsResult = await promptsResponse.json();
    console.log('Prompts list response:', JSON.stringify(promptsResult, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Check if server is running
fetch('http://localhost:3001/api/v1/mcp')
  .then(() => {
    console.log('Server is running, testing prompts...');
    testMcpPrompts();
  })
  .catch(() => {
    console.log('Server is not running. Please start with: npm run dev');
  });