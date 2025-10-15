import multer from "multer";
import { Request } from "express";

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
