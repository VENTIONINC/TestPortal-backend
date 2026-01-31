import type { Request, Response } from "express";
import { getBuildInfo } from "@/lib/buildInfo";

export const metaController = {
  getMeta(_req: Request, res: Response): void {
    const buildInfo = getBuildInfo();
    res.status(200).json(buildInfo);
  },
};
