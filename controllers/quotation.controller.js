import Quotation from "../models/Quotation.js"
import Lead from "../models/Lead.js"
import { createError } from "../utils/error.js"
import { generatePDF } from "../utils/pdf.js"
import { v2 as cloudinary } from "cloudinary"

// Get all quotations with filtering, sorting, and pagination
export const getQuotations = async (req, res, next) => {
  try {
    const { search, status, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 10 } = req.query

    // Build query
    const query = {}

    // Search
    if (search) {
      query.$or = [
        { quotationNumber: { $regex: search, $options: "i" } },
        { "client.name": { $regex: search, $options: "i" } },
        { "client.company": { $regex: search, $options: "i" } },
      ]
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status
    }

    // Access control based on user role
    if (req.user.role === "employee") {
      query.createdBy = req.user.id
    }

    // Count total documents
    const total = await Quotation.countDocuments(query)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Execute query with pagination
    const quotations = await Quotation.find(query)
      .populate("lead", "name email company")
      .populate("createdBy", "name email")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number.parseInt(limit))

    res.status(200).json({
      success: true,
      count: quotations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number.parseInt(page),
      quotations,
    })
  } catch (error) {
    next(error)
  }
}

// Get a single quotation
export const getQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("lead", "name email company")
      .populate("createdBy", "name email")

    if (!quotation) {
      return next(createError(404, "Quotation not found"))
    }

    // Access control
    if (req.user.role === "employee" && quotation.createdBy._id.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to access this quotation"))
    }

    res.status(200).json({
      success: true,
      quotation,
    })
  } catch (error) {
    next(error)
  }
}

// Create a new quotation
export const createQuotation = async (req, res, next) => {
  try {
    // Check if lead exists
    const lead = await Lead.findById(req.body.lead)
    if (!lead) {
      return next(createError(404, "Lead not found"))
    }

    // Access control
    if (req.user.role === "employee" && lead.assignedTo?.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to create quotation for this lead"))
    }

    // Create quotation
    const newQuotation = new Quotation({
      ...req.body,
      createdBy: req.user.id,
    })

    // Calculate amounts if not provided
    if (!newQuotation.subtotal || !newQuotation.tax || !newQuotation.total) {
      const subtotal = newQuotation.items.reduce((sum, item) => sum + item.amount, 0)
      const tax = subtotal * 0.1 // Assuming 10% tax
      const total = subtotal + tax

      newQuotation.subtotal = subtotal
      newQuotation.tax = tax
      newQuotation.total = total
    }

    await newQuotation.save()

    // Generate PDF and upload to Cloudinary
    try {
      const pdfBuffer = await generatePDF(newQuotation)

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "raw",
              public_id: `quotations/${newQuotation._id}`,
              format: "pdf",
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            },
          )
          .end(pdfBuffer)
      })

      // Update quotation with PDF URL
      newQuotation.pdfUrl = result.secure_url
      await newQuotation.save()
    } catch (error) {
      console.error("Error generating PDF:", error)
      // Continue even if PDF generation fails
    }

    // Update lead status if it's not already in proposal or later stage
    if (["new", "contacted", "qualified"].includes(lead.status)) {
      lead.status = "proposal"
      lead.activities.push({
        type: "status_change",
        description: `Status changed from ${lead.status} to proposal due to quotation creation`,
        createdBy: req.user.id,
      })
      await lead.save()
    }

    res.status(201).json({
      success: true,
      quotation: newQuotation,
    })
  } catch (error) {
    next(error)
  }
}

// Update a quotation
export const updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)

    if (!quotation) {
      return next(createError(404, "Quotation not found"))
    }

    // Access control
    if (req.user.role === "employee" && quotation.createdBy.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to update this quotation"))
    }

    // Update quotation
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    )
      .populate("lead", "name email company")
      .populate("createdBy", "name email")

    // If status changed to accepted, update lead status
    if (req.body.status === "accepted" && quotation.status !== "accepted") {
      const lead = await Lead.findById(quotation.lead)
      if (lead) {
        lead.status = "won"
        lead.activities.push({
          type: "status_change",
          description: `Status changed to won due to quotation acceptance`,
          createdBy: req.user.id,
        })
        await lead.save()
      }
    }

    // If status changed to rejected, update lead status
    if (req.body.status === "rejected" && quotation.status !== "rejected") {
      const lead = await Lead.findById(quotation.lead)
      if (lead) {
        lead.status = "lost"
        lead.activities.push({
          type: "status_change",
          description: `Status changed to lost due to quotation rejection`,
          createdBy: req.user.id,
        })
        await lead.save()
      }
    }

    // Regenerate PDF if items or amounts changed
    if (
      req.body.items ||
      req.body.subtotal ||
      req.body.tax ||
      req.body.total ||
      req.body.client ||
      req.body.notes ||
      req.body.terms
    ) {
      try {
        const pdfBuffer = await generatePDF(updatedQuotation)

        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "raw",
                public_id: `quotations/${updatedQuotation._id}`,
                format: "pdf",
              },
              (error, result) => {
                if (error) reject(error)
                else resolve(result)
              },
            )
            .end(pdfBuffer)
        })

        // Update quotation with PDF URL
        updatedQuotation.pdfUrl = result.secure_url
        await updatedQuotation.save()
      } catch (error) {
        console.error("Error regenerating PDF:", error)
        // Continue even if PDF generation fails
      }
    }

    res.status(200).json({
      success: true,
      quotation: updatedQuotation,
    })
  } catch (error) {
    next(error)
  }
}

// Delete a quotation
export const deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)

    if (!quotation) {
      return next(createError(404, "Quotation not found"))
    }

    // Access control
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to delete quotations"))
    }

    // Delete PDF from Cloudinary if exists
    if (quotation.pdfUrl) {
      try {
        await cloudinary.uploader.destroy(`quotations/${quotation._id}`)
      } catch (error) {
        console.error("Error deleting PDF from Cloudinary:", error)
        // Continue even if deletion fails
      }
    }

    await Quotation.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Send quotation email
export const sendQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)

    if (!quotation) {
      return next(createError(404, "Quotation not found"))
    }

    // Access control
    if (req.user.role === "employee" && quotation.createdBy.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to send this quotation"))
    }

    // In a real app, you would send an email with the quotation PDF
    // For this demo, we'll just update the status to 'sent'

    quotation.status = "sent"
    await quotation.save()

    res.status(200).json({
      success: true,
      message: "Quotation sent successfully",
      quotation,
    })
  } catch (error) {
    next(error)
  }
}

// Get quotation statistics
export const getQuotationStats = async (req, res, next) => {
  try {
    // Get counts by status
    const statusCounts = await Quotation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ])

    // Get counts by month (for the last 12 months)
    const today = new Date()
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())

    const monthlyQuotations = await Quotation.aggregate([
      {
        $match: {
          createdAt: { $gte: lastYear },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ])

    // Format the monthly data
    const monthlyData = []
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (let i = 0; i < 12; i++) {
      const month = (today.getMonth() - 11 + i) % 12
      const year = today.getFullYear() - (month > today.getMonth() ? 1 : 0)

      const monthData = monthlyQuotations.find((item) => item._id.month === month + 1 && item._id.year === year)

      monthlyData.push({
        month: months[month],
        year,
        count: monthData ? monthData.count : 0,
        totalAmount: monthData ? monthData.totalAmount : 0,
      })
    }

    res.status(200).json({
      success: true,
      stats: {
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = {
            count: curr.count,
            totalAmount: curr.totalAmount,
          }
          return acc
        }, {}),
        monthlyData,
      },
    })
  } catch (error) {
    next(error)
  }
}
