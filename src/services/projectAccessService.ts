// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import { projectModel } from "@/models/projectModel";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";

type AuthenticatedUser = NonNullable<AuthenticatedRequest["user"]>;

export class ProjectAccessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ProjectAccessError";
  }
}

function ensureUser(user: AuthenticatedRequest["user"]): AuthenticatedUser {
  if (!user) {
    throw new ProjectAccessError("User is not authenticated", 401);
  }

  return user;
}

function canAccessProject(user: AuthenticatedUser, ownerId: string): boolean {
  return user.role === "admin" || ownerId === user.id;
}

function toAccessDenied(): ProjectAccessError {
  return new ProjectAccessError("Project access denied", 403);
}

export const projectAccessService = {
  projectFilterForUser(user: AuthenticatedRequest["user"]) {
    const currentUser = ensureUser(user);

    return currentUser.role === "admin" ? {} : { ownerId: currentUser.id };
  },

  async assertProjectAccess(
    user: AuthenticatedRequest["user"],
    projectId: string,
  ) {
    const currentUser = ensureUser(user);
    const project = await projectModel.findById(projectId);

    if (!project) {
      throw new ProjectAccessError("Project not found", 404);
    }

    if (!canAccessProject(currentUser, project.ownerId)) {
      throw toAccessDenied();
    }

    return project;
  },

  async assertProjectReferenceAccess(
    user: AuthenticatedRequest["user"],
    projectReference: string,
  ) {
    const currentUser = ensureUser(user);
    const project =
      (await projectModel.findById(projectReference)) ??
      (await projectModel.findByName(projectReference));

    if (!project) {
      throw new ProjectAccessError("Project not found", 404);
    }

    if (!canAccessProject(currentUser, project.ownerId)) {
      throw toAccessDenied();
    }

    return project;
  },

  async assertIssueAccess(
    user: AuthenticatedRequest["user"],
    issueId: string,
  ): Promise<void> {
    const issue = await dbClient.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });

    if (!issue) {
      throw new ProjectAccessError("Issue not found", 404);
    }

    await this.assertProjectAccess(user, issue.projectId);
  },

  async assertResultErrorAccess(
    user: AuthenticatedRequest["user"],
    resultErrorId: string,
  ): Promise<void> {
    const resultError = await dbClient.resultError.findUnique({
      where: { id: resultErrorId },
      select: {
        result: {
          select: {
            spec: { select: { projectId: true } },
            execution: { select: { projectId: true } },
          },
        },
      },
    });

    const projectId =
      resultError?.result?.spec.projectId ??
      resultError?.result?.execution.projectId;

    if (!projectId) {
      throw new ProjectAccessError("Result error not found", 404);
    }

    await this.assertProjectAccess(user, projectId);
  },

  async assertResultAccess(
    user: AuthenticatedRequest["user"],
    resultId: string,
  ): Promise<void> {
    const result = await dbClient.result.findUnique({
      where: { id: resultId },
      select: {
        spec: { select: { projectId: true } },
        execution: { select: { projectId: true } },
      },
    });

    const projectId = result?.spec.projectId ?? result?.execution.projectId;

    if (!projectId) {
      throw new ProjectAccessError("Result not found", 404);
    }

    await this.assertProjectAccess(user, projectId);
  },

  async assertAssumptionAccess(
    user: AuthenticatedRequest["user"],
    assumptionId: string,
  ): Promise<void> {
    const assumption = await dbClient.assumption.findUnique({
      where: { id: assumptionId },
      select: {
        issue: { select: { projectId: true } },
        resultError: {
          select: {
            result: {
              select: {
                spec: { select: { projectId: true } },
                execution: { select: { projectId: true } },
              },
            },
          },
        },
      },
    });

    const projectId =
      assumption?.issue.projectId ??
      assumption?.resultError?.result?.spec.projectId ??
      assumption?.resultError?.result?.execution.projectId;

    if (!projectId) {
      throw new ProjectAccessError("Assumption not found", 404);
    }

    await this.assertProjectAccess(user, projectId);
  },
};
