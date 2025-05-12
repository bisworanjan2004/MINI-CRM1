import express from "express"
import {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  addCustomField,
  updateCustomField,
  deleteCustomField,
} from "../controllers/company.controller.js"
import { protect, authorize } from "../middleware/auth.js"
import upload from "../middleware/upload.js"

const router = express.Router()

// Protect all routes
router.use(protect)

// Company settings routes
router.route("/company").get(getCompanySettings).put(authorize("admin", "manager"), updateCompanySettings)

router.route("/company/logo").post(authorize("admin", "manager"), upload.single("logo"), uploadCompanyLogo)

// Custom fields routes
router.route("/custom-fields").post(authorize("admin", "manager"), addCustomField)

router
  .route("/custom-fields/:fieldId")
  .put(authorize("admin", "manager"), updateCustomField)
  .delete(authorize("admin", "manager"), deleteCustomField)

export default router
