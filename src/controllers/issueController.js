import { issueModel } from "../models/issueModel.js";

export const issueController = {
  getAllIssues: async (req, res) => {
    const { category, name, page = 1, limit = 30 } = req.query;

    try {
      const issues = await issueModel.findMany(category, name, page, limit);
      const totalIssues = await issueModel.count(category, name);

      return res.status(200).json({
        issues,
        total: totalIssues,
        page: Number(page),
        totalPages: Math.ceil(totalIssues / limit),
      });
    } catch (error) {
      throw new Error(`Failed to fetch issues. ${error.message}`);
    }
  },

  getIssueById: async (req, res) => {
    const { issueId } = req.params;

    const issueRecords = await issueModel.findById(issueId);

    return res.status(200).json(issueRecords);
  },

  createIssue: async (req, res) => {
    const issueParams = req.body;

    if (!req.body || !req.body?.name) {
      throw new Error("Unable to create issue without name");
    }

    const issueRecord = await issueModel.create(issueParams);

    return res.status(200).json(issueRecord);
  },

  updateIssue: async (req, res) => {
    const { issueId } = req.params;
    const { name, category, description, portal, service, ticket } = req.body;
    const updateData = {
      name,
      category,
      description,
      portal,
      service,
      ticket,
    };

    try {
      const updatedIssue = await issueModel.update(issueId, updateData);

      return res.status(200).json(updatedIssue);
    } catch (error) {
      res.status(400).json({ error: "Failed to update issue" });
    }
  },
};
