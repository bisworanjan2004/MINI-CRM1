import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "admin",
    },
    position: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    settings: {
      language: {
        type: String,
        default: "English",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      appNotifications: {
        type: Boolean,
        default: true,
      },
      theme: {
        type: String,
        default: "system",
      },
    },
    security: {
      twoFactorAuth: {
        type: Boolean,
        default: false,
      },
      sessionTimeout: {
        type: Boolean,
        default: true,
      },
      loginNotifications: {
        type: Boolean,
        default: true,
      },
      passwordExpiry: {
        type: Boolean,
        default: true,
      },
      passwordLastChanged: {
        type: Date,
        default: Date.now,
      },
    },
    loginHistory: [
      {
        device: String,
        browser: String,
        ip: String,
        location: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    this.security.passwordLastChanged = Date.now()
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  })
}

// Add login to history
userSchema.methods.addLoginToHistory = function (loginData) {
  this.loginHistory.unshift(loginData)

  // Keep only the last 10 logins
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(0, 10)
  }

  return this.save()
}

const User = mongoose.model("User", userSchema)

export default User
