import User from "../models/User.js"
import { createError } from "../utils/error.js"

// Register a new user
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(createError(400, "User with this email already exists"))
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
    })

    await newUser.save()

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Login user
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return next(createError(401, "Invalid credentials"))
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return next(createError(401, "Invalid credentials"))
    }

    // Add login to history
    const loginData = {
      device: req.headers["user-agent"] || "Unknown",
      browser: req.headers["user-agent"] || "Unknown",
      ip: req.ip || "Unknown",
      location: "Unknown", // In a real app, you would use a geolocation service
    }

    await user.addLoginToHistory(loginData)

    // Generate token
    const token = user.generateAuthToken()

    // Remove password from response
    const userWithoutPassword = user.toObject()
    delete userWithoutPassword.password

    res.status(200).json({
      success: true,
      token,
      user: userWithoutPassword,
    })
  } catch (error) {
    next(error)
  }
}

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

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

// Logout user
export const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  })
}

// Forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return next(createError(404, "User not found"))
    }

    // In a real app, you would send a password reset email
    // For this demo, we'll just return a success message

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    })
  } catch (error) {
    next(error)
  }
}

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body

    // In a real app, you would verify the token and update the password
    // For this demo, we'll just return a success message

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    })
  } catch (error) {
    next(error)
  }
}

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.id).select("+password")

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return next(createError(401, "Current password is incorrect"))
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    next(error)
  }
}
