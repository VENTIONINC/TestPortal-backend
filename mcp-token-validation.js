/**
 * MCP Token Validation for External APIs
 * 
 * This file contains the validation logic for MCP tokens that can be used
 * by other APIs to authenticate requests from the Test Portal.
 * 
 * Usage:
 * 1. Copy this file to your API project
 * 2. Set MCP_TOKEN_SECRET environment variable (same as Test Portal)
 * 3. Use validateMcpToken() to verify incoming tokens
 * 
 * Example:
 * const { validateMcpToken } = require('./mcp-token-validation');
 * const result = validateMcpToken(token, process.env.MCP_TOKEN_SECRET);
 * if (result) {
 *   console.log('Valid token for user:', result.userId);
 * }
 */

const crypto = require('crypto');

/**
 * Validates an MCP token without database lookup
 * @param {string} token - The MCP token to validate
 * @param {string} secret - The shared secret for token verification
 * @returns {Object|null} - Returns {userId: number, isValid: true} if valid, null if invalid
 */
function validateMcpToken(token, secret) {
  try {
    if (!token || !secret) return null;
    
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    
    const [prefix, userIdStr, timestampStr, randomBytes] = payload.split('_');
    if (prefix !== 'mcp' || !userIdStr || !timestampStr || !randomBytes) return null;
    
    // Verify signature
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    if (expectedSig !== signature) return null;
    
    // Check expiration (30 days)
    const timestamp = parseInt(timestampStr);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    if (isNaN(timestamp) || Date.now() - timestamp > maxAge) return null;
    
    const userId = parseInt(userIdStr);
    if (isNaN(userId)) return null;
    
    return { userId, isValid: true };
  } catch (error) {
    return null;
  }
}

/**
 * Express middleware for MCP token authentication
 * @param {string} secret - The shared secret for token verification
 * @returns {Function} - Express middleware function
 */
function mcpAuthMiddleware(secret) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers['x-mcp-token'];
    
    if (!token) {
      return res.status(401).json({ error: 'MCP token required' });
    }
    
    const result = validateMcpToken(token, secret);
    if (!result) {
      return res.status(401).json({ error: 'Invalid MCP token' });
    }
    
    req.mcpUser = { userId: result.userId };
    next();
  };
}

module.exports = {
  validateMcpToken,
  mcpAuthMiddleware
};