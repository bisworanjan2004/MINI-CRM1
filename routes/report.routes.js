import express from "express"
import {
  getLeadsReport,
  getQuotationsReport,
  getConversionReport,
  getSalesPerformanceReport,
  getDashboardStats,
} from "../controllers/report.controller.js"
import { protect } from "../middleware/auth.js"

const router = express.Router()

// Protect all routes
router.use(protect)

// Routes
router.get("/leads", getLeadsReport)
router.get("/quotations", getQuotationsReport)
router.get("/conversion", getConversionReport)
router.get("/sales-performance", getSalesPerformanceReport)
router.get("/dashboard-stats", getDashboardStats)

export default router
