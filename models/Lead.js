import mongoose from "mongoose"

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["website", "referral", "social_media", "email_campaign", "event", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
      default: "new",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
    activities: [
      {
        type: {
          type: String,
          enum: ["note", "call", "email", "meeting", "task", "status_change"],
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        dueDate: Date,
        completed: {
          type: Boolean,
          default: false,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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

// Add indexes for better query performance
leadSchema.index({ name: "text", email: "text", company: "text" })
leadSchema.index({ status: 1 })
leadSchema.index({ assignedTo: 1 })
leadSchema.index({ createdAt: -1 })

const Lead = mongoose.model("Lead", leadSchema)

export default Lead
