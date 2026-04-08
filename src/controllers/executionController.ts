import { Request, Response } from "express";
import { executionService } from "@/services/executionService";
import { failureGroupingService } from "@/services/failureGroupingService";
import type { AcceptFailureGroupRequest, GroupFailuresRequest } from "@/types";

const validGroupingCategories = new Set([
  "bug",
  "infra",
  "performance",
  "script",
  "other",
]);

interface ExecutionRequestContext {
  executionId: string;
  projectId: string;
}

const getExecutionRequestContext = (
  req: Request,
  res: Response,
): ExecutionRequestContext | null => {
  const { executionId } = req.params;
  const { projectId } = req.query as Record<string, string>;

  if (!executionId) {
    res.status(400).json({ error: "Execution ID is required" });
    return null;
  }

  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return null;
  }

  return { executionId, projectId };
};

const respondWithFailureGroupingError = (
  error: unknown,
  res: Response,
): void => {
  const err = error as Error;
  const statusCode = err.message.includes("not found") ? 404 : 400;
  res.status(statusCode).json({ error: err.message });
};

export const executionController = {
  getExecutionById: async (req: Request, res: Response): Promise<void> => {
    try {
      const requestContext = getExecutionRequestContext(req, res);
      if (!requestContext) {
        return;
      }

      const execution = await executionService.getExecutionById(
        requestContext.executionId,
        requestContext.projectId,
      );
      res.status(200).json(execution);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  deleteExecution: async (req: Request, res: Response): Promise<void> => {
    try {
      const requestContext = getExecutionRequestContext(req, res);
      if (!requestContext) {
        return;
      }

      await executionService.deleteExecution(
        requestContext.executionId,
        requestContext.projectId,
      );
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("not found")) {
        res.status(404).json({
          error: err.message,
        });
      } else {
        res.status(500).json({
          error: `Failed to delete execution. ${err.message}`,
        });
      }
    }
  },

  groupFailures: async (req: Request, res: Response): Promise<void> => {
    try {
      const requestContext = getExecutionRequestContext(req, res);
      const { category } = req.body as GroupFailuresRequest;

      if (!requestContext) {
        return;
      }

      if (!category || !validGroupingCategories.has(category)) {
        res.status(400).json({
          error:
            "category must be one of: bug, infra, performance, script, other",
        });
        return;
      }

      const response = await failureGroupingService.groupFailures(
        requestContext.executionId,
        requestContext.projectId,
        category,
      );
      res.status(200).json(response);
    } catch (error) {
      respondWithFailureGroupingError(error, res);
    }
  },

  acceptGroup: async (req: Request, res: Response): Promise<void> => {
    try {
      const requestContext = getExecutionRequestContext(req, res);
      const { issueId, groupResultErrorIds } =
        req.body as AcceptFailureGroupRequest;

      if (!requestContext) {
        return;
      }

      if (!issueId) {
        res.status(400).json({ error: "Issue ID is required" });
        return;
      }

      if (
        !Array.isArray(groupResultErrorIds) ||
        groupResultErrorIds.length === 0
      ) {
        res.status(400).json({
          error:
            "groupResultErrorIds must contain at least one result error ID",
        });
        return;
      }

      const response = await failureGroupingService.acceptGroup(
        requestContext.executionId,
        requestContext.projectId,
        issueId,
        groupResultErrorIds,
      );
      res.status(201).json(response);
    } catch (error) {
      respondWithFailureGroupingError(error, res);
    }
  },
};
