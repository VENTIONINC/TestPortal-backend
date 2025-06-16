import { Router } from "express";
import { issueController } from "@/controllers/issueController";

const router = Router();

router.get("/v1/issues", issueController.getAllIssues);
router.get("/v1/issues/with-stats", issueController.getAllIssuesWithStats);
router.get("/v1/issues/:issueId", issueController.getIssueById);
router.post("/v1/issues", issueController.createIssue);
router.patch("/v1/issues/:issueId", issueController.updateIssue);
router.get("/v1/issues-test-mcp", issueController.getIssuesTestMCP);

export default router;
