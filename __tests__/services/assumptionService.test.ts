// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { PrismaAssumption } from "@/types";

const assumptions: PrismaAssumption[] = [];

// Mock setup BEFORE imports of code under test
jest.mock("@/models/assumptionModel", () => ({
  assumptionModel: {
    findById: jest.fn((id: string, projectId: string) => {
      const assumption = assumptions.find(
        (a) => a.id === id && a.issueId === projectId,
      );
      return Promise.resolve(assumption ?? null);
    }),
    delete: jest.fn((id: string) => {
      const index = assumptions.findIndex((a) => a.id === id);
      if (index === -1) throw new Error("Assumption not found");
      const deleted = assumptions.splice(index, 1)[0];
      return Promise.resolve(deleted);
    }),
  },
}));

// Import code under test AFTER mocks
import { assumptionService } from "@/services/assumptionService";
import { assumptionModel } from "@/models/assumptionModel";

describe("assumptionService.deleteAssumption", () => {
  const projectId = "test-project-id";
  const assumptionId = "test-assumption-id";

  const createAssumption = (
    id: string,
    issueId: string = projectId,
  ): PrismaAssumption => ({
    id,
    issueId,
    resultErrorId: "test-error-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    isConfirmed: false,
    madeBy: "agent",
    score: 0.8,
  });

  beforeEach(() => {
    assumptions.length = 0;
    jest.clearAllMocks();
  });

  describe("Successful deletion", () => {
    it("should successfully delete an assumption when it exists", async () => {
      // Arrange
      const assumption = createAssumption(assumptionId);
      assumptions.push(assumption);

      // Act
      await assumptionService.deleteAssumption(assumptionId, projectId);

      // Assert
      expect(assumptionModel.findById).toHaveBeenCalledWith(
        assumptionId,
        projectId,
      );
      expect(assumptionModel.delete).toHaveBeenCalledWith(assumptionId);
      expect(assumptions.length).toBe(0);
    });

    it("should call findById before delete to verify existence", async () => {
      // Arrange
      const assumption = createAssumption(assumptionId);
      assumptions.push(assumption);

      // Act
      await assumptionService.deleteAssumption(assumptionId, projectId);

      // Assert
      expect(assumptionModel.findById).toHaveBeenCalled();
      expect(assumptionModel.delete).toHaveBeenCalled();
    });
  });

  describe("Not found scenarios", () => {
    it("should throw error when assumption does not exist", async () => {
      // Arrange - empty assumptions array

      // Act & Assert
      await expect(
        assumptionService.deleteAssumption(assumptionId, projectId),
      ).rejects.toThrow(`Assumption with ID ${assumptionId} not found`);

      expect(assumptionModel.findById).toHaveBeenCalledWith(
        assumptionId,
        projectId,
      );
      expect(assumptionModel.delete).not.toHaveBeenCalled();
    });

    it("should throw error when assumption belongs to different project", async () => {
      // Arrange
      const assumption = createAssumption(assumptionId, "different-project-id");
      assumptions.push(assumption);

      // Act & Assert
      await expect(
        assumptionService.deleteAssumption(assumptionId, projectId),
      ).rejects.toThrow(`Assumption with ID ${assumptionId} not found`);

      expect(assumptionModel.delete).not.toHaveBeenCalled();
    });
  });

  describe("Validation errors", () => {
    it("should throw error when assumptionId is missing", async () => {
      // Act & Assert
      await expect(
        assumptionService.deleteAssumption("", projectId),
      ).rejects.toThrow("Assumption ID is required");

      expect(assumptionModel.findById).not.toHaveBeenCalled();
      expect(assumptionModel.delete).not.toHaveBeenCalled();
    });

    it("should throw error when projectId is missing", async () => {
      // Act & Assert
      await expect(
        assumptionService.deleteAssumption(assumptionId, ""),
      ).rejects.toThrow("Project ID is required");

      expect(assumptionModel.findById).not.toHaveBeenCalled();
      expect(assumptionModel.delete).not.toHaveBeenCalled();
    });

    it("should throw error when both IDs are missing", async () => {
      // Act & Assert
      await expect(assumptionService.deleteAssumption("", "")).rejects.toThrow(
        "Assumption ID is required",
      );

      expect(assumptionModel.findById).not.toHaveBeenCalled();
      expect(assumptionModel.delete).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle deletion of confirmed assumption", async () => {
      // Arrange
      const assumption = createAssumption(assumptionId);
      assumption.isConfirmed = true;
      assumptions.push(assumption);

      // Act
      await assumptionService.deleteAssumption(assumptionId, projectId);

      // Assert
      expect(assumptionModel.delete).toHaveBeenCalledWith(assumptionId);
      expect(assumptions.length).toBe(0);
    });

    it("should handle deletion of user-made assumption", async () => {
      // Arrange
      const assumption = createAssumption(assumptionId);
      assumption.madeBy = "user";
      assumptions.push(assumption);

      // Act
      await assumptionService.deleteAssumption(assumptionId, projectId);

      // Assert
      expect(assumptionModel.delete).toHaveBeenCalledWith(assumptionId);
      expect(assumptions.length).toBe(0);
    });

    it("should handle special characters in IDs", async () => {
      // Arrange
      const specialId = "test-assumption-123-abc";
      const assumption = createAssumption(specialId);
      assumptions.push(assumption);

      // Act
      await assumptionService.deleteAssumption(specialId, projectId);

      // Assert
      expect(assumptionModel.findById).toHaveBeenCalledWith(
        specialId,
        projectId,
      );
      expect(assumptionModel.delete).toHaveBeenCalledWith(specialId);
      expect(assumptions.length).toBe(0);
    });
  });
});
