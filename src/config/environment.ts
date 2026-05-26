const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? "";
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "";
const COGNITO_POOL_REGION = process.env.COGNITO_POOL_REGION ?? "";
const AUTH_PROVIDER = process.env.AUTH_PROVIDER;
const DEFAULT_PROJECT_ID =
  process.env.DEFAULT_PROJECT_ID ?? "b4225bdf-9e2b-43f9-8f13-5bb6f5079176"; // Default Project UUID

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? "test@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "testpassword123";

const APP_VERSION = process.env.npm_package_version ?? "0.0.0";

// LangSmith Configuration
const LANGSMITH_TRACING =
  process.env.LANGSMITH_TRACING?.toLowerCase() === "true";
const LANGSMITH_ENDPOINT =
  process.env.LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com";
const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY ?? "";
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT ?? "test-portal-backend";

const SUPPORTED_AUTH_PROVIDERS = ["local", "cognito"] as const;
type AuthProviderName = (typeof SUPPORTED_AUTH_PROVIDERS)[number];

const isSupportedAuthProvider = (
  value: string | undefined,
): value is AuthProviderName =>
  Boolean(value && SUPPORTED_AUTH_PROVIDERS.includes(value as AuthProviderName));

if (!AUTH_PROVIDER) {
  throw new Error(
    "AUTH_PROVIDER environment variable is required. Supported values are: local, cognito.",
  );
}

if (!isSupportedAuthProvider(AUTH_PROVIDER)) {
  throw new Error(
    `Unsupported AUTH_PROVIDER "${AUTH_PROVIDER}". Supported values are: local, cognito.`,
  );
}

// Check if Cognito is configured
export const isCognitoConfigured = Boolean(
  COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID && COGNITO_POOL_REGION,
);

if (AUTH_PROVIDER === "cognito" && !isCognitoConfigured) {
  throw new Error(
    "AUTH_PROVIDER is set to cognito, but Cognito configuration is incomplete. Set COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, and COGNITO_POOL_REGION.",
  );
}

if (AUTH_PROVIDER !== "cognito" && !isCognitoConfigured) {
  console.warn(
    "Cognito authentication is not configured. Set COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, and COGNITO_POOL_REGION to enable Cognito features.",
  );
}

// Check if LangSmith is configured
export const isLangSmithConfigured = Boolean(
  LANGSMITH_TRACING && LANGSMITH_API_KEY,
);

if (LANGSMITH_TRACING && !LANGSMITH_API_KEY) {
  console.warn(
    "LangSmith tracing is enabled but LANGSMITH_API_KEY is not set. Tracing will not work.",
  );
} else if (isLangSmithConfigured) {
  console.log(
    `LangSmith tracing enabled for project: ${LANGSMITH_PROJECT}`,
  );
}

export const environment = {
  auth: {
    provider: AUTH_PROVIDER,
  },
  cognito: {
    userPoolId: COGNITO_USER_POOL_ID,
    clientId: COGNITO_CLIENT_ID,
    region: COGNITO_POOL_REGION,
  },
  langsmith: {
    tracingEnabled: LANGSMITH_TRACING,
    endpoint: LANGSMITH_ENDPOINT,
    apiKey: LANGSMITH_API_KEY,
    project: LANGSMITH_PROJECT,
  },
  defaultProjectId: DEFAULT_PROJECT_ID,
  testUser: {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  },
  appVersion: APP_VERSION,
};

export {
  AUTH_PROVIDER,
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  COGNITO_POOL_REGION,
  DEFAULT_PROJECT_ID,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  APP_VERSION,
  LANGSMITH_TRACING,
  LANGSMITH_ENDPOINT,
  LANGSMITH_API_KEY,
  LANGSMITH_PROJECT,
};
