import { Router } from "express";
import { resultErrorController } from "@/controllers/resultErrorController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.patch(
  "/v1/result-errors/:resultErrorId/assign-issue",
  authMiddleware,
  resultErrorController.assignIssue,
);
router.patch(
  "/v1/result-errors/:resultErrorId/review",
  authMiddleware,
  resultErrorController.reviewError,
);
router.patch("/v1/result-errors/bulk-review", authMiddleware, resultErrorController.bulkReview);
router.get(
  "/v1/result-errors/:resultErrorId",
  authMiddleware,
  resultErrorController.getResultErrorById,
);

export default router;
