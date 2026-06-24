// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { CognitoUserPool } from "amazon-cognito-identity-js";

import {
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  isCognitoConfigured,
} from "../config/environment";

let userPool: CognitoUserPool | null = null;

if (isCognitoConfigured) {
  try {
    userPool = new CognitoUserPool({
      UserPoolId: COGNITO_USER_POOL_ID,
      ClientId: COGNITO_CLIENT_ID,
    });
  } catch (error) {
    console.warn(
      "Cognito configuration is present but invalid. Cognito features will be disabled.",
      error,
    );
  }
}

export { userPool };
