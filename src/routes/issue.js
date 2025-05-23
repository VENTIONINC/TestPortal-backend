import { Router } from "express";
import { issueController } from "../controllers/issueController.js";

const router = Router();

router.get("/issues", issueController.getAllIssues);
router.get("/issues/:issueId", issueController.getIssueById);
router.post("/issues", issueController.createIssue);
router.patch("/issues/:issueId", issueController.updateIssue);
router.get("/issues-test-mcp", issueController.getIssuesTestMCP);

export default router;
