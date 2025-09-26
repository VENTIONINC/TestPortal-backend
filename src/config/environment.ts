const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? "";
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "";
const COGNITO_POOL_REGION = process.env.COGNITO_POOL_REGION ?? "";
const DEFAULT_PROJECT_ID = process.env.DEFAULT_PROJECT_ID
  ? process.env.DEFAULT_PROJECT_ID
  : "b4225bdf-9e2b-43f9-8f13-5bb6f5079176"; // Default Project UUID

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? "test@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "testpassword123";
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
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
};
