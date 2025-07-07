import { jest } from "@jest/globals";

// Mock to prevent actual model loading during tests
jest.mock("@/prisma/client", () => ({ dbClient: {} }));
jest.mock("@xenova/transformers");

import { VectorSimilarityService } from "../vectorSimilarityService";

describe("VectorSimilarityService - Core Mathematical Functions", () => {
  let service: VectorSimilarityService;

  beforeEach(() => {
    service = new VectorSimilarityService();
  });

  describe("calculateCosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      const vector = [1, 2, 3];
      const result = service.calculateCosineSimilarity(vector, vector);
      expect(result).toBeCloseTo(1, 5);
    });

    it("returns 0 for orthogonal vectors", () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const result = service.calculateCosineSimilarity(vectorA, vectorB);
      expect(result).toBeCloseTo(0, 5);
    });

    it("returns -1 for opposite vectors", () => {
      const vectorA = [1, 0, 0];
      const vectorB = [-1, 0, 0];
      const result = service.calculateCosineSimilarity(vectorA, vectorB);
      expect(result).toBeCloseTo(-1, 5);
    });

    it("handles normalized vectors", () => {
      const vectorA = [0.6, 0.8];
      const vectorB = [0.8, 0.6];
      const result = service.calculateCosineSimilarity(vectorA, vectorB);
      expect(result).toBeCloseTo(0.96, 2);
    });

    it("returns 0 for zero magnitude vectors", () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];
      const result = service.calculateCosineSimilarity(vectorA, vectorB);
      expect(result).toBe(0);
    });

    it("throws error for different dimension vectors", () => {
      const vectorA = [1, 2];
      const vectorB = [1, 2, 3];
      expect(() => service.calculateCosineSimilarity(vectorA, vectorB)).toThrow(
        "Vectors must have the same dimensions",
      );
    });

    it("handles complex calculations correctly", () => {
      const vectorA = [1, -2, 3];
      const vectorB = [2, -1, 1];
      const result = service.calculateCosineSimilarity(vectorA, vectorB);

      // Manual calculation: (1*2 + (-2)*(-1) + 3*1) / (sqrt(14) * sqrt(6))
      const expected = 7 / (Math.sqrt(14) * Math.sqrt(6));
      expect(result).toBeCloseTo(expected, 5);
    });

    it("always returns values in range [-1, 1]", () => {
      const testCases = [
        [
          [1, 0],
          [0, 1],
        ],
        [
          [1, 1],
          [1, 1],
        ],
        [
          [1, 0],
          [-1, 0],
        ],
        [
          [3, 4],
          [4, 3],
        ],
        [
          [-1, -2],
          [2, 1],
        ],
      ];

      testCases.forEach(([vecA, vecB]) => {
        const similarity = service.calculateCosineSimilarity(
          vecA as number[],
          vecB as number[],
        );
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Service Configuration", () => {
    it("initializes with correct defaults", () => {
      const info = service.getModelInfo();
      expect(info.modelName).toBe("Xenova/all-MiniLM-L6-v2");
      expect(info.dimensions).toBe(384);
      expect(info.isLoaded).toBe(false);
    });

    it("starts as not ready", () => {
      expect(service.isReady()).toBe(false);
    });

    it("has empty cache initially", () => {
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(1000); // default
    });
  });
});
