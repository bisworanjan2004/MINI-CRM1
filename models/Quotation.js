import mongoose from "mongoose"

const quotationItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
  },
  unitPrice: {
    type: Number,
    required: [true, "Unit price is required"],
    min: [0, "Unit price cannot be negative"],
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0, "Amount cannot be negative"],
  },
})

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: [true, "Quotation number is required"],
      unique: true,
      trim: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: [true, "Lead is required"],
    },
    client: {
      name: {
        type: String,
        required: [true, "Client name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Client email is required"],
        trim: true,
        lowercase: true,
      },
      company: {
        type: String,
        required: [true, "Company name is required"],
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, "Valid until date is required"],
    },
    items: [quotationItemSchema],
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    tax: {
      type: Number,
      required: [true, "Tax is required"],
      min: [0, "Tax cannot be negative"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    notes: {
      type: String,
      trim: true,
    },
    terms: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
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
quotationSchema.index({ quotationNumber: 1 })
quotationSchema.index({ lead: 1 })
quotationSchema.index({ "client.name": "text", "client.company": "text" })
quotationSchema.index({ status: 1 })
quotationSchema.index({ createdAt: -1 })

const Quotation = mongoose.model("Quotation", quotationSchema)

export default Quotation
