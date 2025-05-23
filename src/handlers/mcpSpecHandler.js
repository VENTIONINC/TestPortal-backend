import { specService } from "../services/specService.js";

export const mcpSpecHandler = {
  async getSpecById(specId) {
    return await specService.getSpecById(specId);
  },
};
