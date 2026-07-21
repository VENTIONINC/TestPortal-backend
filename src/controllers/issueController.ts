// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Response } from "express";
import { type AuthenticatedRequest } from "@/middleware/authMiddleware";
import { issueService } from "@/services/issueService";
import { buildIssueParams } from "@/lib/params-builder";
import {
  ProjectAccessError,
  projectAccessService,
} from "@/services/projectAccessService";

import type { CreateIssueParams, UpdateIssueParams } from "@/types";

type IssueIdParams = {
  issueId: string;
};

export const issueController = {
  getAllIssues: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        projectId,
        category,
        name,
        page = "1",
        limit = "30",
      } = req.query as Record<string, string>;

      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const params = buildIssueParams({
        projectId,
        category,
        name,
        page,
        limit,
      });
      const result = await issueService.getAllIssues(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 500).json({
        error: `Failed to fetch issues. ${err.message}`,
      });
    }
  },
  getAllIssuesV2: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        projectId,
        category,
        name,
        page = "1",
        limit = "10",
      } = req.query as Record<string, string>;

      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const params = buildIssueParams({
        projectId,
        category,
        name,
        page,
        limit,
      });
      const result = await issueService.getAllIssuesV2(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 500).json({
        error: `Failed to fetch issues. ${err.message}`,
      });
    }
  },

  getAllIssuesWithStats: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        projectId,
        category,
        name,
        page = "1",
        limit = "10",
        statFrom,
        statTo,
      } = req.query as Record<string, string>;

      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const params = buildIssueParams({
        projectId,
        category,
        name,
        page,
        limit,
        statFrom,
        statTo,
      });
      const result = await issueService.getAllIssuesWithStats(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 500).json({
        error: `Failed to fetch issues with statistics. ${err.message}`,
      });
    }
  },

  getAllIssuesWithStatsV2: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        projectId,
        category,
        name,
        page = "1",
        limit = "10",
        statFrom,
        statTo,
      } = req.query as Record<string, string>;

      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const params = buildIssueParams({
        projectId,
        category,
        name,
        page,
        limit,
        statFrom,
        statTo,
      });
      const result = await issueService.getAllIssuesWithStatsV2(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 500).json({
        error: `Failed to fetch issues with statistics. ${err.message}`,
      });
    }
  },

  getIssueById: async (
    req: AuthenticatedRequest<IssueIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { issueId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      // Validate required projectId
      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const issueRecords = await issueService.getIssueById(issueId, projectId);
      res.status(200).json(issueRecords);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  // V2 method with serialized response including user information
  getIssueByIdV2: async (
    req: AuthenticatedRequest<IssueIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { issueId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      // Validate required projectId
      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const issueRecords = await issueService.getIssueByIdV2(
        issueId,
        projectId,
      );
      res.status(200).json(issueRecords);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  createIssue: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const issueParams: CreateIssueParams = req.body;
      const user = req.user;
      if (user) {
        issueParams.createdById = user.id;
        issueParams.updatedById = user.id;
      }

      if (!issueParams) {
        res.status(400).json({
          error: "Issue data is required",
        });
        return;
      }

      if (!issueParams.projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, issueParams.projectId);

      const issueRecord = await issueService.createIssue(issueParams);
      res.status(201).json(issueRecord);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: err.message,
      });
    }
  },

  updateIssue: async (
    req: AuthenticatedRequest<IssueIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { issueId } = req.params;
      const updateData: UpdateIssueParams = req.body;
      const user = (req as AuthenticatedRequest).user;
      if (user) {
        updateData.updatedById = user.id;
      }

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: "Update data is required",
        });
        return;
      }

      await projectAccessService.assertIssueAccess(req.user, issueId);

      const updatedIssue = await issueService.updateIssue(issueId, updateData);
      res.status(200).json(updatedIssue);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to update issue. ${err.message}`,
      });
    }
  },

  deleteIssue: async (
    req: AuthenticatedRequest<IssueIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { issueId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      // Validate required projectId
      if (!projectId) {
        res.status(400).json({
          error: "projectId query parameter is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const deletedIssue = await issueService.deleteIssue(issueId, projectId);
      res.status(200).json({
        message: "Issue and all associated assumptions deleted successfully",
        issue: deletedIssue,
      });
    } catch (error) {
      const err = error as Error;

      // Check if it's a "not found" error
      if (error instanceof ProjectAccessError) {
        res.status(error.statusCode).json({
          error: err.message,
        });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({
          error: err.message,
        });
        return;
      }

      // General error
      res.status(400).json({
        error: `Failed to delete issue. ${err.message}`,
      });
    }
  },
};
