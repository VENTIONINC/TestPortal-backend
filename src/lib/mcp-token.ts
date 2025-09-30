import crypto from 'crypto';

/**
 * Generates a self-contained MCP token for API authentication
 * Format: mcp_{userId}_{timestamp}_{randomBytes}.{hmacSignature}
 */
export function generateMcpToken(userId: string, secret: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const payload = `mcp_${userId}_${timestamp}_${randomBytes}`;

  const signature = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `${payload}.${signature}`;
}

/**
 * Validates an MCP token without database lookup
 * Returns user info if valid, null if invalid
 */
export function validateMcpToken(token: string, secret: string): { userId: string; isValid: true } | null {
  try {
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
    if (Date.now() - timestamp > maxAge) return null;

    // UUID validation pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(userIdStr)) return null;

    return { userId: userIdStr, isValid: true };
  } catch {
    return null;
  }
}