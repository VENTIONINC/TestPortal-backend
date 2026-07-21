// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import multer from "multer";
import { Request, Response, NextFunction } from "express";

import { MAX_SKILL_PACKAGE_TOTAL_BYTES } from "@/lib/skills/skillPackage";

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

const skillPackageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const isZip =
    file.mimetype === "application/zip" ||
    file.mimetype === "application/x-zip-compressed" ||
    file.originalname.toLowerCase().endsWith(".zip");

  if (isZip) {
    cb(null, true);
    return;
  }

  cb(new Error("Only zip skill packages are allowed"));
};

export const uploadSkillPackage = multer({
  storage,
  fileFilter: skillPackageFileFilter,
  limits: {
    files: 1,
    fields: 2,
    fileSize: MAX_SKILL_PACKAGE_TOTAL_BYTES + 64 * 1024,
  },
}).single("package");

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
