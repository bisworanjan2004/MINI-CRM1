import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js"
import User from "../models/User.js"

// Protect routes
export const protect = async (req, res, next) => {
  try {
    let token

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    // Check if token exists
    if (!token) {
      return next(createError(401, "Not authorized to access this route"))
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password")

      if (!req.user) {
        return next(createError(401, "User not found"))
      }

      next()
    } catch (error) {
      return next(createError(401, "Not authorized to access this route"))
    }
  } catch (error) {
    next(error)
  }
}

// Authorize roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError(403, `User role ${req.user.role} is not authorized to access this route`))
    }
    next()
  }
}
