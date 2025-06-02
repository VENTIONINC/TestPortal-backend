import { Router, Request, Response } from "express";
import { generateOpenAPISpec } from "@/lib/openapi";

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

export default router;
