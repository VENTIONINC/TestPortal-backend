import type { PrismaUser } from "@/types";
import { environment } from "@/config/environment";
import {
  userService,
  UserServiceError,
  type UserApplicationRole,
  type UserLifecycleStatus,
} from "@/services/userService";
import { signInUser, signOutUser } from "@/services/authService";

export type AuthProviderName = "local" | "cognito";

export interface AuthLoginRequest {
  email: string;
  password: string;
  newPassword?: string;
}

export interface AuthSignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthCapabilityFlags {
  passwordLogin: boolean;
  passwordSignup: boolean;
  requiresRedirectLogin: boolean;
  supportsNewPasswordChallenge: boolean;
  signupRequiresApproval: boolean;
}

export interface AuthConfigResponse {
  provider: AuthProviderName;
  capabilities: AuthCapabilityFlags;
}

export interface AuthChallengeResponse {
  status: "NEW_PASSWORD_REQUIRED";
  message: string;
}

export interface AuthSignupResponse {
  user: PrismaUser;
  message?: string;
}

interface AuthProviderLoginSuccess {
  status: "SUCCESS";
  user: PrismaUser;
  cognitoSession?: unknown;
}

interface AuthProviderLoginChallenge {
  status: "NEW_PASSWORD_REQUIRED";
  message: string;
}

type AuthProviderLoginResult =
  | AuthProviderLoginSuccess
  | AuthProviderLoginChallenge;

interface AuthProvider {
  getConfig(): AuthConfigResponse;
  login(params: AuthLoginRequest): Promise<AuthProviderLoginResult>;
  signup(params: AuthSignupRequest): Promise<AuthSignupResponse>;
  logout(): Promise<string>;
}

const LOCAL_AUTH_CAPABILITIES: AuthCapabilityFlags = {
  passwordLogin: true,
  passwordSignup: true,
  requiresRedirectLogin: false,
  supportsNewPasswordChallenge: false,
  signupRequiresApproval: true,
};

const COGNITO_AUTH_CAPABILITIES: AuthCapabilityFlags = {
  passwordLogin: true,
  passwordSignup: true,
  requiresRedirectLogin: false,
  supportsNewPasswordChallenge: true,
  signupRequiresApproval: false,
};

const localAuthProvider: AuthProvider = {
  getConfig: () => ({
    provider: "local",
    capabilities: LOCAL_AUTH_CAPABILITIES,
  }),

  async login({ email, password }) {
    const user = userService.assertActiveUser(
      await userService.verifyPassword(email, password),
    );

    return {
      status: "SUCCESS",
      user,
    };
  },

  async signup({ name, email, password }) {
    const user = await userService.signup({
      name,
      email,
      password,
      status: "pending",
      role: "member",
    });

    return {
      user,
      message: userService.LOCAL_SIGNUP_PENDING_MESSAGE,
    };
  },

  async logout() {
    return "Signed out successfully";
  },
};

const cognitoAuthProvider: AuthProvider = {
  getConfig: () => ({
    provider: "cognito",
    capabilities: COGNITO_AUTH_CAPABILITIES,
  }),

  async login({ email, password, newPassword }) {
    const cognitoResult = await signInUser({
      email,
      password,
      ...(newPassword ? { newPassword } : {}),
    });

    if (cognitoResult.status === "NEW_PASSWORD_REQUIRED") {
      return {
        status: "NEW_PASSWORD_REQUIRED",
        message: "New password required for first login",
      };
    }

    let user = await userService.findUserByEmail(email);
    if (!user) {
      user = await userService.createCognitoBackedUser(email);
    }

    user = userService.assertActiveUser(user);

    return {
      status: "SUCCESS",
      user,
      ...(cognitoResult.session ? { cognitoSession: cognitoResult.session } : {}),
    };
  },

  async signup({ name, email, password }) {
    const { user } = await userService.signupWithCognito(name, email, password);

    return {
      user,
      message:
        "User created successfully with Cognito. Please check your email for verification.",
    };
  },

  async logout() {
    return (await signOutUser()) as string;
  },
};

const authProviders: Record<AuthProviderName, AuthProvider> = {
  local: localAuthProvider,
  cognito: cognitoAuthProvider,
};

export const resolveActiveAuthProvider = (): AuthProvider => {
  const provider = authProviders[environment.auth.provider];

  if (!provider) {
    throw new Error(
      `Unsupported AUTH_PROVIDER "${environment.auth.provider}". Supported values are: local, cognito.`,
    );
  }

  return provider;
};

export const authProviderService = {
  getConfig(): AuthConfigResponse {
    return resolveActiveAuthProvider().getConfig();
  },

  async login(
    params: AuthLoginRequest,
  ): Promise<ReturnType<typeof userService.createAuthResponse> | AuthChallengeResponse> {
    const result = await resolveActiveAuthProvider().login(params);

    if (result.status === "NEW_PASSWORD_REQUIRED") {
      return {
        status: result.status,
        message: result.message,
      };
    }

    return userService.createAuthResponse(result.user, {
      ...(result.cognitoSession ? { cognitoSession: result.cognitoSession } : {}),
    });
  },

  async signup(params: AuthSignupRequest): Promise<AuthSignupResponse> {
    return await resolveActiveAuthProvider().signup(params);
  },

  async logout(): Promise<string> {
    return await resolveActiveAuthProvider().logout();
  },
};

export const isBlockedAuthError = (error: unknown): error is UserServiceError =>
  error instanceof UserServiceError && error.statusCode === 403;

export type AuthUserStatus = UserLifecycleStatus;
export type AuthUserRole = UserApplicationRole;
