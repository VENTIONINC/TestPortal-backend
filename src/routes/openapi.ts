// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenAPISpec } from "@/lib/openapi/index";

const router = Router();

router.get("/openapi.json", (_req: Request, res: Response): void => {
  try {
    const spec = generateOpenAPISpec();
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(spec);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      error: `Failed to generate OpenAPI specification: ${err.message}`,
    });
  }
});

router.use("/swagger", swaggerUi.serve);

router.get(
  "/swagger",
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const spec = generateOpenAPISpec();
      swaggerUi.setup(spec)(req, res, next);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to generate Swagger UI: ${err.message}`,
      });
    }
  },
);

export default router;
