import { Router } from "express";
import { resultErrorController } from "@/controllers/resultErrorController";

const router = Router();

router.patch(
  "/v1/result-errors/:resultErrorId/assign-issue",
  resultErrorController.assignIssue,
);
router.patch(
  "/v1/result-errors/:resultErrorId/review",
  resultErrorController.reviewError,
);
router.patch("/v1/result-errors/bulk-review", resultErrorController.bulkReview);
router.get(
  "/v1/result-errors/:resultErrorId",
  resultErrorController.getResultErrorById,
);

export default router;
