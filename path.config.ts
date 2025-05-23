import path, { join } from "path";
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);

export const ROOT_DIR: string = path.dirname(__filename);
export const DB_DIR: string = join(ROOT_DIR, "prisma");
export const TMP_DIR: string = join(ROOT_DIR, ".tmp");
export const LOGS_DIR: string = join(TMP_DIR, "logs");
