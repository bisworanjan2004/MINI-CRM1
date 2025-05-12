import express from "express"
import {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  getQuotationStats,
} from "../controllers/quotation.controller.js"
import { protect, authorize } from "../middleware/auth.js"

const router = express.Router()

// Protect all routes
router.use(protect)

// Routes
router.route("/").get(getQuotations).post(createQuotation)

router.route("/stats").get(getQuotationStats)

router.route("/:id").get(getQuotation).put(updateQuotation).delete(authorize("admin", "manager"), deleteQuotation)

router.route("/:id/send").post(sendQuotation)

export default router
