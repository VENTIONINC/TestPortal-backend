import { Router } from "express";
import { specController } from "../controllers/specController.js";

const router = Router();

router.get("/specs/:specId", specController.getSpecById);

export default router;
