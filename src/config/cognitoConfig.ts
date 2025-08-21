import { CognitoUserPool } from 'amazon-cognito-identity-js';

import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '../config/environment';

export const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_USER_POOL_ID,
  ClientId: COGNITO_CLIENT_ID,
});
