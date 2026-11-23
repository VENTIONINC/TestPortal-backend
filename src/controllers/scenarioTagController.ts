// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  assignScenarioTag,
  inlineScenarioTag,
  selectionTagCounts,
} from "@/models/scenarioTagAssignment";
import {
  deleteScenarioTags,
  previewTagDeletion,
  undoScenarioTagDeletion,
} from "@/models/scenarioTagDeletion";
import { OrganizationError } from "@/models/testScenarioOrganizationErrors";
import {
  assignmentBody,
  inlineTagBody,
  selectedScenarioIds,
  tagDelete,
  tagFields,
  tagItemParams,
  tagProjectParams,
  tagSelection,
  tagUndo,
} from "@/schemas/scenarioTagSchemas";
import { listProjectTags, saveProjectTag } from "@/services/scenarioTagService";
import { TestScenarioNotFoundError } from "@/types/testScenarios";

interface TagRequest {
  projectId: string;
  actorId: string;
  params: AuthenticatedRequest["params"];
  body: unknown;
}
function projectRoute(
  action: (request: TagRequest) => Promise<unknown>,
  status = 200,
) {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    try {
      const { projectId } = tagProjectParams.parse(req.params);
      const result = await action({
        projectId,
        actorId: req.user.id,
        params: req.params,
        body: req.body,
      });
      if (status === 204) res.sendStatus(204);
      else res.status(status).json(result);
    } catch (error) {
      if (error instanceof ZodError)
        res.status(400).json({ error: error.issues[0]?.message });
      else if (error instanceof OrganizationError)
        res.status(error.status).json({ error: error.message });
      else if (error instanceof TestScenarioNotFoundError)
        res.status(404).json({ error: error.message });
      else throw error;
    }
  };
}
export const scenarioTagController = {
  list: projectRoute(({ projectId }) => listProjectTags(projectId)),
  create: projectRoute(
    ({ projectId, body }) => saveProjectTag(projectId, tagFields.parse(body)),
    201,
  ),
  edit: projectRoute(({ projectId, params, body }) =>
    saveProjectTag(
      projectId,
      tagFields.parse(body),
      tagItemParams.parse(params).tagId,
    ),
  ),
  preview: projectRoute(({ projectId, body }) =>
    previewTagDeletion(projectId, tagSelection.parse(body).tagIds),
  ),
  remove: projectRoute(({ projectId, actorId, body }) => {
    const { tagIds, revision, operationId } = tagDelete.parse(body);
    return deleteScenarioTags(
      projectId,
      actorId,
      tagIds,
      revision,
      operationId,
    );
  }),
  undo: projectRoute(
    ({ projectId, actorId, body }) =>
      undoScenarioTagDeletion(
        projectId,
        actorId,
        tagUndo.parse(body).operationId,
      ),
    204,
  ),
  inline: projectRoute(({ projectId, body }) =>
    inlineScenarioTag(projectId, inlineTagBody.parse(body).name),
  ),
  assign: projectRoute(({ projectId, body }) =>
    assignScenarioTag(projectId, assignmentBody.parse(body)),
  ),
  counts: projectRoute(({ projectId, body }) =>
    selectionTagCounts(projectId, selectedScenarioIds.parse(body).scenarioIds),
  ),
};
