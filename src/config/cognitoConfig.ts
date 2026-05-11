// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { CognitoUserPool } from "amazon-cognito-identity-js";

import {
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  isCognitoConfigured,
} from "../config/environment";

export const userPool = isCognitoConfigured
  ? new CognitoUserPool({
      UserPoolId: COGNITO_USER_POOL_ID,
      ClientId: COGNITO_CLIENT_ID,
    })
  : null;
