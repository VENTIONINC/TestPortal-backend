import multer from "multer";
import { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (
    file.mimetype === "application/json" ||
    file.originalname.endsWith(".json")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only JSON files are allowed"));
  }
};

export const uploadJsonReport = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
}).single("report");

export const uploadErrorHandler = (
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError || err instanceof Error) {
    (err as Error & { status?: number }).status = 400;
    next(err);
    return;
  }

  next(err);
};
