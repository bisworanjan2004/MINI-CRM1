import Company from "../models/Company.js"
import { createError } from "../utils/error.js"
import { v2 as cloudinary } from "cloudinary"

// Get company settings
export const getCompanySettings = async (req, res, next) => {
  try {
    // Find company settings (there should only be one document)
    let company = await Company.findOne()

    // If no company settings exist, create default settings
    if (!company) {
      company = await Company.create({
        name: "My Company",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        phone: "",
        website: "",
        taxId: "",
        industry: "",
        logo: "",
        about: "",
        customFields: [],
      })
    }

    res.status(200).json({
      success: true,
      company,
    })
  } catch (error) {
    next(error)
  }
}

// Update company settings
export const updateCompanySettings = async (req, res, next) => {
  try {
    // Only admin and manager can update company settings
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to update company settings"))
    }

    // Find company settings
    let company = await Company.findOne()

    // If no company settings exist, create new settings
    if (!company) {
      company = new Company(req.body)
    } else {
      // Update existing settings
      Object.keys(req.body).forEach((key) => {
        // Handle custom fields separately
        if (key !== "customFields") {
          company[key] = req.body[key]
        }
      })
    }

    // Update custom fields if provided
    if (req.body.customFields) {
      company.customFields = req.body.customFields
    }

    await company.save()

    res.status(200).json({
      success: true,
      company,
    })
  } catch (error) {
    next(error)
  }
}

// Upload company logo
export const uploadCompanyLogo = async (req, res, next) => {
  try {
    // Only admin and manager can update company logo
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to update company logo"))
    }

    // Check if file exists
    if (!req.file) {
      return next(createError(400, "Please upload a file"))
    }

    // Find company settings
    const company = await Company.findOne()

    if (!company) {
      return next(createError(404, "Company settings not found"))
    }

    // Delete old logo from Cloudinary if exists
    if (company.logo && company.logo.includes("cloudinary")) {
      try {
        const publicId = company.logo.split("/").pop().split(".")[0]
        await cloudinary.uploader.destroy(`company/${publicId}`)
      } catch (error) {
        console.error("Error deleting logo from Cloudinary:", error)
        // Continue even if deletion fails
      }
    }

    // Upload new logo to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "company",
      width: 500,
      crop: "limit",
    })

    // Update company logo
    company.logo = result.secure_url
    await company.save()

    res.status(200).json({
      success: true,
      logo: company.logo,
    })
  } catch (error) {
    next(error)
  }
}

// Add custom field
export const addCustomField = async (req, res, next) => {
  try {
    // Only admin and manager can add custom fields
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to add custom fields"))
    }

    // Find company settings
    const company = await Company.findOne()

    if (!company) {
      return next(createError(404, "Company settings not found"))
    }

    // Add custom field
    company.customFields.push(req.body)
    await company.save()

    res.status(201).json({
      success: true,
      customField: company.customFields[company.customFields.length - 1],
    })
  } catch (error) {
    next(error)
  }
}

// Update custom field
export const updateCustomField = async (req, res, next) => {
  try {
    // Only admin and manager can update custom fields
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to update custom fields"))
    }

    // Find company settings
    const company = await Company.findOne()

    if (!company) {
      return next(createError(404, "Company settings not found"))
    }

    // Find custom field
    const fieldIndex = company.customFields.findIndex((field) => field._id.toString() === req.params.fieldId)

    if (fieldIndex === -1) {
      return next(createError(404, "Custom field not found"))
    }

    // Update custom field
    company.customFields[fieldIndex] = {
      ...company.customFields[fieldIndex].toObject(),
      ...req.body,
    }

    await company.save()

    res.status(200).json({
      success: true,
      customField: company.customFields[fieldIndex],
    })
  } catch (error) {
    next(error)
  }
}

// Delete custom field
export const deleteCustomField = async (req, res, next) => {
  try {
    // Only admin and manager can delete custom fields
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to delete custom fields"))
    }

    // Find company settings
    const company = await Company.findOne()

    if (!company) {
      return next(createError(404, "Company settings not found"))
    }

    // Find custom field
    const fieldIndex = company.customFields.findIndex((field) => field._id.toString() === req.params.fieldId)

    if (fieldIndex === -1) {
      return next(createError(404, "Custom field not found"))
    }

    // Remove custom field
    company.customFields.splice(fieldIndex, 1)
    await company.save()

    res.status(200).json({
      success: true,
      message: "Custom field deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}
