// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router, type Request, type Response } from "express";
import { environment } from "@/config/environment";

const router = Router();

export const statusHandler = (_req: Request, res: Response): void => {
  res.status(200).json({ status: "ok", version: environment.appVersion });
};

router.get("/v2/status", statusHandler);

export default router;
