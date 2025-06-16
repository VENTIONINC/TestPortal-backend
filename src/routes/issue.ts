import { Router } from "express";
import { issueController } from "@/controllers/issueController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.get("/v1/issues", issueController.getAllIssues);
router.get("/v1/issues/with-stats", issueController.getAllIssuesWithStats);
router.get("/v1/issues/:issueId", issueController.getIssueById);
router.post("/v1/issues", issueController.createIssue);
router.patch("/v1/issues/:issueId", issueController.updateIssue);

router.get("/v2/issues", authMiddleware, issueController.getAllIssuesV2);
router.get(
  "/v2/issues/with-stats",
  authMiddleware,
  issueController.getAllIssuesWithStatsV2,
);
router.get(
  "/v2/issues/:issueId",
  authMiddleware,
  issueController.getIssueByIdV2,
);
router.post("/v2/issues", authMiddleware, issueController.createIssue);
router.patch(
  "/v2/issues/:issueId",
  authMiddleware,
  issueController.updateIssue,
);

export default router;
