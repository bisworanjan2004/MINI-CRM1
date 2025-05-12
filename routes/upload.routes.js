import express from "express"
import { uploadAvatar, uploadDocument } from "../controllers/upload.controller.js"
import { protect } from "../middleware/auth.js"
import upload from "../middleware/upload.js"

const router = express.Router()

// Protect all routes
router.use(protect)

// Routes
router.post("/avatar", upload.single("avatar"), uploadAvatar)
router.post("/document", upload.single("document"), uploadDocument)

export default router
