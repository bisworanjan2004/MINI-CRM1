import Lead from "../models/Lead.js"
import { createError } from "../utils/error.js"

// Get all leads with filtering, sorting, and pagination
export const getLeads = async (req, res, next) => {
  try {
    const {
      search,
      status,
      assignedTo,
      source,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = req.query

    // Build query
    const query = {}

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ]
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status
    }

    // Filter by assigned user
    if (assignedTo && assignedTo !== "all") {
      if (assignedTo === "unassigned") {
        query.assignedTo = { $exists: false }
      } else {
        query.assignedTo = assignedTo
      }
    }

    // Filter by source
    if (source && source !== "all") {
      query.source = source
    }

    // Access control based on user role
    if (req.user.role === "employee") {
      query.assignedTo = req.user.id
    }

    // Count total documents
    const total = await Lead.countDocuments(query)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Execute query with pagination
    const leads = await Lead.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number.parseInt(limit))

    res.status(200).json({
      success: true,
      count: leads.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number.parseInt(page),
      leads,
    })
  } catch (error) {
    next(error)
  }
}

// Get a single lead
export const getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("activities.createdBy", "name email")

    if (!lead) {
      return next(createError(404, "Lead not found"))
    }

    // Access control
    if (req.user.role === "employee" && lead.assignedTo?.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to access this lead"))
    }

    res.status(200).json({
      success: true,
      lead,
    })
  } catch (error) {
    next(error)
  }
}

// Create a new lead
export const createLead = async (req, res, next) => {
  try {
    const newLead = new Lead({
      ...req.body,
      createdBy: req.user.id,
    })

    await newLead.save()

    res.status(201).json({
      success: true,
      lead: newLead,
    })
  } catch (error) {
    next(error)
  }
}

// Update a lead
export const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)

    if (!lead) {
      return next(createError(404, "Lead not found"))
    }

    // Access control
    if (req.user.role === "employee" && lead.assignedTo?.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to update this lead"))
    }

    // If status is changing, add an activity
    if (req.body.status && req.body.status !== lead.status) {
      lead.activities.push({
        type: "status_change",
        description: `Status changed from ${lead.status} to ${req.body.status}`,
        createdBy: req.user.id,
      })
    }

    // Update lead
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    )
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")

    res.status(200).json({
      success: true,
      lead: updatedLead,
    })
  } catch (error) {
    next(error)
  }
}

// Delete a lead
export const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)

    if (!lead) {
      return next(createError(404, "Lead not found"))
    }

    // Access control
    if (req.user.role === "employee") {
      return next(createError(403, "Not authorized to delete leads"))
    }

    await Lead.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Add an activity to a lead
export const addActivity = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)

    if (!lead) {
      return next(createError(404, "Lead not found"))
    }

    // Access control
    if (req.user.role === "employee" && lead.assignedTo?.toString() !== req.user.id) {
      return next(createError(403, "Not authorized to update this lead"))
    }

    const activity = {
      ...req.body,
      createdBy: req.user.id,
    }

    lead.activities.push(activity)
    await lead.save()

    // Populate the newly added activity
    const populatedLead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("activities.createdBy", "name email")

    res.status(200).json({
      success: true,
      lead: populatedLead,
    })
  } catch (error) {
    next(error)
  }
}

// Get lead statistics
export const getLeadStats = async (req, res, next) => {
  try {
    // Get counts by status
    const statusCounts = await Lead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Get counts by source
    const sourceCounts = await Lead.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ])

    // Get counts by month (for the last 12 months)
    const today = new Date()
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())

    const monthlyLeads = await Lead.aggregate([
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

      const monthData = monthlyLeads.find((item) => item._id.month === month + 1 && item._id.year === year)

      monthlyData.push({
        month: months[month],
        year,
        count: monthData ? monthData.count : 0,
      })
    }

    res.status(200).json({
      success: true,
      stats: {
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count
          return acc
        }, {}),
        sourceCounts: sourceCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count
          return acc
        }, {}),
        monthlyData,
      },
    })
  } catch (error) {
    next(error)
  }
}
