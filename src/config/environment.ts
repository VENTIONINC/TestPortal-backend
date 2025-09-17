const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? "";
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "";
const COGNITO_POOL_REGION = process.env.COGNITO_POOL_REGION ?? "";
const DEFAULT_PROJECT_ID = process.env.DEFAULT_PROJECT_ID
  ? parseInt(process.env.DEFAULT_PROJECT_ID, 10)
  : 1;
// Check if Cognito is configured
export const isCognitoConfigured = Boolean(
  COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID && COGNITO_POOL_REGION,
);

// Only warn if Cognito is not configured (don't throw error)
if (!isCognitoConfigured) {
  console.warn(
    "Cognito authentication is not configured. Set COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, and COGNITO_POOL_REGION to enable Cognito features.",
  );
}

export {
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  COGNITO_POOL_REGION,
  DEFAULT_PROJECT_ID,
};
