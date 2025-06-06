import { Router, Request, Response } from "express";
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
import mcp from "@/mcp/server";

const router = Router();

router.get("/v1", (_request: Request, response: Response): void => {
  response.status(200).send("Welcome");
});

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
router.use(mcp);

export default router;

