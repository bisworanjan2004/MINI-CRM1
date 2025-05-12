import User from "../models/User.js"
import { createError } from "../utils/error.js"
import { v2 as cloudinary } from "cloudinary"

// Get all users
export const getUsers = async (req, res, next) => {
  try {
    // Only admin and manager can get all users
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to access this resource"))
    }

    const users = await User.find().select("-password -loginHistory")

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    })
  } catch (error) {
    next(error)
  }
}

// Get user by ID
export const getUser = async (req, res, next) => {
  try {
    // Users can only access their own profile unless they are admin or manager
    if (req.user.role === "employee" && req.params.id !== req.user.id) {
      return next(createError(403, "Not authorized to access this resource"))
    }

    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return next(createError(404, "User not found"))
    }

    res.status(200).json({
      success: true,
      user,
    })
  } catch (error) {
    next(error)
  }
}

// Update user
export const updateUser = async (req, res, next) => {
  try {
    // Users can only update their own profile unless they are admin
    if (req.user.role !== "admin" && req.params.id !== req.user.id) {
      return next(createError(403, "Not authorized to update this user"))
    }

    // Prevent role change unless admin
    if (req.body.role && req.user.role !== "admin") {
      delete req.body.role
    }

    // Find user
    const user = await User.findById(req.params.id)

    if (!user) {
      return next(createError(404, "User not found"))
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    ).select("-password")

    res.status(200).json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    next(error)
  }
}

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    // Only admin can delete users
    if (req.user.role !== "admin") {
      return next(createError(403, "Not authorized to delete users"))
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return next(createError(404, "User not found"))
    }

    // Delete user avatar from Cloudinary if exists
    if (user.avatar && user.avatar.includes("cloudinary")) {
      try {
        const publicId = user.avatar.split("/").pop().split(".")[0]
        await cloudinary.uploader.destroy(`avatars/${publicId}`)
      } catch (error) {
        console.error("Error deleting avatar from Cloudinary:", error)
        // Continue even if deletion fails
      }
    }

    await User.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Update user settings
export const updateUserSettings = async (req, res, next) => {
  try {
    // Users can only update their own settings
    if (req.params.id !== req.user.id) {
      return next(createError(403, "Not authorized to update these settings"))
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return next(createError(404, "User not found"))
    }

    // Update settings
    user.settings = {
      ...user.settings,
      ...req.body,
    }

    await user.save()

    res.status(200).json({
      success: true,
      settings: user.settings,
    })
  } catch (error) {
    next(error)
  }
}

// Update user security settings
export const updateUserSecurity = async (req, res, next) => {
  try {
    // Users can only update their own security settings
    if (req.params.id !== req.user.id) {
      return next(createError(403, "Not authorized to update these settings"))
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return next(createError(404, "User not found"))
    }

    // Update security settings
    user.security = {
      ...user.security,
      ...req.body,
    }

    await user.save()

    res.status(200).json({
      success: true,
      security: user.security,
    })
  } catch (error) {
    next(error)
  }
}

// Get user login history
export const getUserLoginHistory = async (req, res, next) => {
  try {
    // Users can only view their own login history unless they are admin
    if (req.user.role !== "admin" && req.params.id !== req.user.id) {
      return next(createError(403, "Not authorized to access this resource"))
    }

    const user = await User.findById(req.params.id).select("loginHistory")

    if (!user) {
      return next(createError(404, "User not found"))
    }

    res.status(200).json({
      success: true,
      loginHistory: user.loginHistory,
    })
  } catch (error) {
    next(error)
  }
}
