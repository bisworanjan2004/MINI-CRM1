import { v2 as cloudinary } from "cloudinary"
import { createError } from "../utils/error.js"

// Upload user avatar
export const uploadAvatar = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.file) {
      return next(createError(400, "Please upload a file"))
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
      width: 200,
      height: 200,
      crop: "fill",
    })

    res.status(200).json({
      success: true,
      url: result.secure_url,
    })
  } catch (error) {
    next(error)
  }
}

// Upload document
export const uploadDocument = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.file) {
      return next(createError(400, "Please upload a file"))
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "documents",
      resource_type: "auto",
    })

    res.status(200).json({
      success: true,
      url: result.secure_url,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    })
  } catch (error) {
    next(error)
  }
}
