import { Router } from "express";
import issue from "@/routes/issue";
import results from "@/routes/results";
import jsonReport from "@/routes/json-report";
import specs from "@/routes/specs";
import executions from "@/routes/executions";
import assumptions from "@/routes/assumptions";
import resultErrors from "@/routes/result-errors";
import autoReview from "@/routes/auto-review";
import status from "@/routes/status";
import users from "@/routes/users";
import openapi from "@/routes/openapi";
import testAnalysis from "@/routes/test-analysis";
import errorFormatter from "@/routes/error-formatter";
import prompts from "@/routes/promptRoutes";
import mcp from "@/mcp/server";

const router = Router();

router.use(jsonReport);
router.use(results);
router.use(issue);
router.use(specs);
router.use(executions);
router.use(assumptions);
router.use(resultErrors);
router.use(autoReview);
router.use(status);
router.use(users);
router.use(openapi);
router.use(testAnalysis);
router.use(errorFormatter);
router.use(prompts);
router.use(mcp);

export default router;
