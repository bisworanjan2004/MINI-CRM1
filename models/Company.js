import mongoose from "mongoose"

const customFieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Field name is required"],
    trim: true,
  },
  entity: {
    type: String,
    enum: ["lead", "quotation", "client"],
    required: [true, "Entity is required"],
  },
  type: {
    type: String,
    enum: ["text", "number", "date", "dropdown", "checkbox"],
    required: [true, "Field type is required"],
  },
  options: [String], // For dropdown fields
  required: {
    type: Boolean,
    default: false,
  },
})

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    about: {
      type: String,
      trim: true,
    },
    customFields: [customFieldSchema],
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

const Company = mongoose.model("Company", companySchema)

export default Company
