import express from "express"
import {
  register,
  login,
  getCurrentUser,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller.js"
import { protect } from "../middleware/auth.js"

const router = express.Router()

// Public routes
router.post("/register", register)
router.post("/login", login)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

// Protected routes
router.get("/me", protect, getCurrentUser)
router.post("/logout", protect, logout)
router.post("/change-password", protect, changePassword)

export default router
