import express from "express"
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  addActivity,
  getLeadStats,
} from "../controllers/lead.controller.js"
import { protect, authorize } from "../middleware/auth.js"

const router = express.Router()

// Protect all routes
router.use(protect)

// Routes
router.route("/").get(getLeads).post(createLead)

router.route("/stats").get(getLeadStats)

router.route("/:id").get(getLead).put(updateLead).delete(authorize("admin", "manager"), deleteLead)

router.route("/:id/activities").post(addActivity)

export default router
