import { Router } from "express";
import { resultErrorController } from "../controllers/resultErrorController.js";

const router = Router();

router.patch(
  "/result-errors/:resultErrorId/assign-issue",
  resultErrorController.assignIssue,
);
router.patch(
  "/result-errors/:resultErrorId/review",
  resultErrorController.reviewError,
);
router.patch("/result-errors/bulk-review", resultErrorController.bulkReview);

export default router;
