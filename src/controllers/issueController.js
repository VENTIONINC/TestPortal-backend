import { issueService } from "../services/issueService.js";

export const issueController = {
  getAllIssues: async (req, res) => {
    try {
      const { category, name, page = 1, limit = 30 } = req.query;

      const result = await issueService.getAllIssues({
        category,
        name,
        page,
        limit,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        error: `Failed to fetch issues. ${error.message}`,
      });
    }
  },

  getIssueById: async (req, res) => {
    try {
      const { issueId } = req.params;
      const issueRecords = await issueService.getIssueById(issueId);
      return res.status(200).json(issueRecords);
    } catch (error) {
      return res.status(404).json({
        error: error.message,
      });
    }
  },

  createIssue: async (req, res) => {
    try {
      const issueParams = req.body;
      const issueRecord = await issueService.createIssue(issueParams);
      return res.status(201).json(issueRecord);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  },

  updateIssue: async (req, res) => {
    try {
      const { issueId } = req.params;
      const updateData = req.body;

      const updatedIssue = await issueService.updateIssue(issueId, updateData);
      return res.status(200).json(updatedIssue);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to update issue. ${error.message}`,
      });
    }
  },

  // Test endpoint for MCP
  getIssuesTestMCP: async (req, res) => {
    try {
      const { category, name, page = 1, limit = 30 } = req.query;
      console.log("getIssuesTestMCP", category, name, page, limit);

      const mockIssues = await issueService.getMockIssues();
      return res.status(200).json(mockIssues);
    } catch (error) {
      console.log("error", error);
      return res.status(500).json({
        error: "Failed to fetch issues",
      });
    }
  },
};
