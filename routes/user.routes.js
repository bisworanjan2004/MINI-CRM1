import express from "express"
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserSettings,
  updateUserSecurity,
  getUserLoginHistory,
} from "../controllers/user.controller.js"
import { protect, authorize } from "../middleware/auth.js"

const router = express.Router()

// Protect all routes
router.use(protect)

// Routes
router.route("/").get(authorize("admin", "manager"), getUsers)

router.route("/:id").get(getUser).put(updateUser).delete(authorize("admin"), deleteUser)

router.route("/:id/settings").put(updateUserSettings)

router.route("/:id/security").put(updateUserSecurity)

router.route("/:id/login-history").get(getUserLoginHistory)

export default router
