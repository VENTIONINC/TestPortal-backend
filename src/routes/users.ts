import { Router } from "express";
import { userController } from "@/controllers/userController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

// PUBLIC ROUTES
router.post("/users/signup", userController.signup);
router.post("/users/login", userController.login);
router.post("/users/refresh-token", userController.refreshToken);

// PROTECTED ROUTES
router.get("/users/:userId", authMiddleware, userController.getUserById);
router.patch("/users/:userId", authMiddleware, userController.updateUser);

export default router;
