// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Router, Request, Response } from "express";
import issue from "@/routes/issue";
import results from "@/routes/results";
import jsonReport from "@/routes/json-report";
import specs from "@/routes/specs";
import executions from "@/routes/executions";
import assumptions from "@/routes/assumptions";
import resultErrors from "@/routes/result-errors";
import status from "@/routes/status";
import users from "@/routes/users";
import openapi from "@/routes/openapi";
import errorFormatter from "@/routes/error-formatter";
import prompts from "@/routes/promptRoutes";
import skills from "@/routes/skillRoutes";
import projects from "@/routes/projects";
import ctrf from "@/routes/ctrf";
import upload from "@/routes/upload";
import analysisExport from "@/routes/analysis-export";
import reports from "@/routes/reports";
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
router.use(status);
router.use(users);
router.use(openapi);
router.use(errorFormatter);
router.use(analysisExport);
router.use(prompts);
router.use(skills);
router.use(projects);
router.use(ctrf);
router.use(upload);
router.use(reports);
router.use(mcp);

export default router;
