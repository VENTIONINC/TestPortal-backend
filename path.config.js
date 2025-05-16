import path, {join} from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export const ROOT_DIR = path.dirname(__filename);
export const DB_DIR = join(ROOT_DIR, 'prisma');
export const TMP_DIR = join(ROOT_DIR, '.tmp');
export const LOGS_DIR = join(TMP_DIR, 'logs');