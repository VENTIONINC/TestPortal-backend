import { Router, type Request, type Response } from "express";

const router = Router();

export const statusHandler = (_req: Request, res: Response): void => {
  res.status(200).json({ status: "ok" });
};

router.get("/v1/status", statusHandler);

export default router;
