import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import { userPool } from "@/config/cognitoConfig";

type SignInType = (params: {
  email: string;
  password: string;
  newPassword?: string;
}) => Promise<{
  status: "SUCCESS" | "NEW_PASSWORD_REQUIRED";
  session?: CognitoUserSession;
}>;

export const signUpUser = (
  username: string,
  email: string,
  password: string,
) => {
  return new Promise((resolve, reject) => {
    userPool.signUp(
      username,
      password,
      [new CognitoUserAttribute({ Name: "email", Value: email })],
      [],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          if (result) {
            resolve(result.user);
          } else {
            reject(new Error("User not created"));
          }
        }
      },
    );
  });
};

export const signInUser: SignInType = ({ email, password, newPassword }) => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve({ status: "SUCCESS", session: result });
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: (userAttributes) => {
        delete userAttributes.email_verified;
        delete userAttributes.phone_number_verified;
        delete userAttributes.email;

        if (newPassword) {
          cognitoUser.completeNewPasswordChallenge(
            newPassword,
            userAttributes,
            {
              onSuccess: (result) => {
                resolve({ status: "SUCCESS", session: result });
              },
              onFailure: (err) => {
                reject(err);
              },
            },
          );
        } else {
          resolve({ status: "NEW_PASSWORD_REQUIRED" });
        }
      },
    });
  });
};

export const signOutUser = () => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    return new Promise((resolve) => {
      cognitoUser.signOut(() => {
        resolve("Signed out successfully");
      });
    });
  }

  return Promise.resolve("No user signed in");
};
