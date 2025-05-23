import { issueService } from "../services/issueService.js";

export const mcpIssueHandler = {
  async getAllIssues(params) {
    const { category, name, page = 1, limit = 30 } = params || {};
    return await issueService.getAllIssues({ category, name, page, limit });
  },

  async getIssueById(issueId) {
    return await issueService.getIssueById(issueId);
  },

  async createIssue(issueParams) {
    return await issueService.createIssue(issueParams);
  },

  async updateIssue(issueId, updateData) {
    return await issueService.updateIssue(issueId, updateData);
  },

  async getMockIssues() {
    return await issueService.getMockIssues();
  },
};
