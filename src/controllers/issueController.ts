import { Request, Response } from "express";
import { type AuthenticatedRequest } from "@/middleware/authMiddleware";
import { issueService } from "@/services/issueService";

import type { CreateIssueParams, UpdateIssueParams } from "@/types";
import { IssueCategory } from "@/types/enums";

export const issueController = {
  getAllIssues: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        name,
        page = "1",
        limit = "30",
      } = req.query as Record<string, string>;

      // Build parameters object, filtering out undefined values
      const params: {
        category?: IssueCategory;
        name?: string;
        page?: number;
        limit?: number;
      } = {};
      if (category) params.category = category as IssueCategory;
      if (name) params.name = name;
      if (page) params.page = Number(page);
      if (limit) params.limit = Number(limit);

      const result = await issueService.getAllIssues(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch issues. ${err.message}`,
      });
    }
  },
  getAllIssuesV2: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        name,
        page = "1",
        limit = "10",
      } = req.query as Record<string, string>;

      // Build parameters object, filtering out undefined values
      const params: {
        category?: IssueCategory;
        name?: string;
        page?: number;
        limit?: number;
      } = {};
      if (category) params.category = category as IssueCategory;
      if (name) params.name = name;
      if (page) params.page = Number(page);
      if (limit) params.limit = Number(limit);

      const result = await issueService.getAllIssuesV2(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch issues. ${err.message}`,
      });
    }
  },

  getAllIssuesWithStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        name,
        page = "1",
        limit = "10",
        statFrom,
        statTo,
      } = req.query as Record<string, string>;

      // Build parameters object, filtering out undefined values
      const params: {
        category?: IssueCategory;
        name?: string;
        page?: number;
        limit?: number;
        statFrom?: string;
        statTo?: string;
      } = {};
      if (category) params.category = category as IssueCategory;
      if (name) params.name = name;
      if (page) params.page = Number(page);
      if (limit) params.limit = Number(limit);
      if (statFrom) params.statFrom = statFrom;
      if (statTo) params.statTo = statTo;

      const result = await issueService.getAllIssuesWithStats(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch issues with statistics. ${err.message}`,
      });
    }
  },

  getAllIssuesWithStatsV2: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        category,
        name,
        page = "1",
        limit = "10",
        statFrom,
        statTo,
      } = req.query as Record<string, string>;

      // Build parameters object, filtering out undefined values
      const params: {
        category?: IssueCategory;
        name?: string;
        page?: number;
        limit?: number;
        statFrom?: string;
        statTo?: string;
      } = {};
      if (category) params.category = category as IssueCategory;
      if (name) params.name = name;
      if (page) params.page = Number(page);
      if (limit) params.limit = Number(limit);
      if (statFrom) params.statFrom = statFrom;
      if (statTo) params.statTo = statTo;

      const result = await issueService.getAllIssuesWithStatsV2(params);

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch issues with statistics. ${err.message}`,
      });
    }
  },

  getIssueById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { issueId } = req.params;

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      const issueRecords = await issueService.getIssueById(issueId);
      res.status(200).json(issueRecords);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  // V2 method with serialized response including user information
  getIssueByIdV2: async (req: Request, res: Response): Promise<void> => {
    try {
      const { issueId } = req.params;

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      const issueRecords = await issueService.getIssueByIdV2(issueId);
      res.status(200).json(issueRecords);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  createIssue: async (req: Request, res: Response): Promise<void> => {
    try {
      const issueParams: CreateIssueParams = req.body;
      const user = (req as AuthenticatedRequest).user;
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

      const issueRecord = await issueService.createIssue(issueParams);
      res.status(201).json(issueRecord);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: err.message,
      });
    }
  },

  updateIssue: async (req: Request, res: Response): Promise<void> => {
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

      const updatedIssue = await issueService.updateIssue(
        issueId,
        updateData,
      );
      res.status(200).json(updatedIssue);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to update issue. ${err.message}`,
      });
    }
  },

  deleteIssue: async (req: Request, res: Response): Promise<void> => {
    try {
      const { issueId } = req.params;

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      const deletedIssue = await issueService.deleteIssue(issueId);
      res.status(200).json({
        message: "Issue and all associated assumptions deleted successfully",
        issue: deletedIssue,
      });
    } catch (error) {
      const err = error as Error;

      // Check if it's a "not found" error
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
