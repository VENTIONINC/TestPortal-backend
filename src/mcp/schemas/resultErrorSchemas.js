import { z } from "zod";

/**
 * Schema for assigning an issue to a result error
 */
export const assignIssueSchema = {
  resultErrorId: z.string(),
  assumptionId: z.number(),
};

/**
 * Schema for reviewing a result error
 */
export const reviewErrorSchema = {
  resultErrorId: z.string(),
};

/**
 * Schema for bulk reviewing multiple result errors
 */
export const bulkReviewSchema = {
  errorIds: z.array(z.number()),
};

/**
 * Schema for getting a specific result error by ID
 */
export const getResultErrorByIdSchema = {
  resultErrorId: z.string(),
};
