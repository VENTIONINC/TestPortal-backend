import { projectService } from "@/services/projectService";
import { projectModel } from "@/models/projectModel";

// Mock dependencies
jest.mock("@/models/projectModel");

// Mock Prisma client
const mockTx = {};
jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback) => callback(mockTx)),
  },
}));

describe("projectService transactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteProject", () => {
    const projectId = "project-1";

    it("should use transaction for deleteProject", async () => {
      (projectModel.findById as jest.Mock).mockResolvedValue({
        id: projectId,
        _count: { executions: 0, specs: 0, issues: 0 },
      });
      (projectModel.delete as jest.Mock).mockResolvedValue({ id: projectId });

      await projectService.deleteProject(projectId);

      expect(projectModel.findById).toHaveBeenCalledWith(projectId, mockTx);
      expect(projectModel.delete).toHaveBeenCalledWith(projectId, mockTx);
    });

    it("should fail if project has associated data within transaction", async () => {
      (projectModel.findById as jest.Mock).mockResolvedValue({
        id: projectId,
        _count: { executions: 1, specs: 0, issues: 0 },
      });

      await expect(projectService.deleteProject(projectId)).rejects.toThrow(
        "Cannot delete project with existing data",
      );
      expect(projectModel.findById).toHaveBeenCalledWith(projectId, mockTx);
      expect(projectModel.delete).not.toHaveBeenCalled();
    });
  });
});
