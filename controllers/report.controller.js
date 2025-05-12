import Lead from "../models/Lead.js"
import Quotation from "../models/Quotation.js"
import User from "../models/User.js"
import { createError } from "../utils/error.js"

// Get leads report
export const getLeadsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1))
    const end = endDate ? new Date(endDate) : new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createError(400, "Invalid date format"))
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999)

    // Build query
    const query = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    }

    // Access control based on user role
    if (req.user.role === "employee") {
      query.assignedTo = req.user.id
    }

    // Get leads by status
    const leadsByStatus = await Lead.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Get leads by source
    const leadsBySource = await Lead.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ])

    // Get leads by month
    const leadsByMonth = await Lead.aggregate([
      {
        $match: query,
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

    // Create a map of all months in the date range
    const startMonth = start.getMonth()
    const startYear = start.getFullYear()
    const endMonth = end.getMonth()
    const endYear = end.getFullYear()

    let currentMonth = startMonth
    let currentYear = startYear

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthData = leadsByMonth.find(
        (item) => item._id.month === currentMonth + 1 && item._id.year === currentYear,
      )

      monthlyData.push({
        month: months[currentMonth],
        year: currentYear,
        count: monthData ? monthData.count : 0,
      })

      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
    }

    // Get leads by assignee
    const leadsByAssignee = await Lead.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignee",
        },
      },
      {
        $unwind: {
          path: "$assignee",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$assignee._id",
          name: { $first: "$assignee.name" },
          count: { $sum: 1 },
        },
      },
    ])

    // Add unassigned leads
    const unassignedLeads = await Lead.countDocuments({
      ...query,
      assignedTo: { $exists: false },
    })

    if (unassignedLeads > 0) {
      leadsByAssignee.push({
        _id: null,
        name: "Unassigned",
        count: unassignedLeads,
      })
    }

    res.status(200).json({
      success: true,
      report: {
        dateRange: {
          start,
          end,
        },
        totalLeads: await Lead.countDocuments(query),
        leadsByStatus: leadsByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count
          return acc
        }, {}),
        leadsBySource: leadsBySource.reduce((acc, curr) => {
          acc[curr._id] = curr.count
          return acc
        }, {}),
        leadsByMonth: monthlyData,
        leadsByAssignee,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get quotations report
export const getQuotationsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1))
    const end = endDate ? new Date(endDate) : new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createError(400, "Invalid date format"))
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999)

    // Build query
    const query = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    }

    // Access control based on user role
    if (req.user.role === "employee") {
      query.createdBy = req.user.id
    }

    // Get quotations by status
    const quotationsByStatus = await Quotation.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ])

    // Get quotations by month
    const quotationsByMonth = await Quotation.aggregate([
      {
        $match: query,
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

    // Create a map of all months in the date range
    const startMonth = start.getMonth()
    const startYear = start.getFullYear()
    const endMonth = end.getMonth()
    const endYear = end.getFullYear()

    let currentMonth = startMonth
    let currentYear = startYear

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthData = quotationsByMonth.find(
        (item) => item._id.month === currentMonth + 1 && item._id.year === currentYear,
      )

      monthlyData.push({
        month: months[currentMonth],
        year: currentYear,
        count: monthData ? monthData.count : 0,
        totalAmount: monthData ? monthData.totalAmount : 0,
      })

      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
    }

    // Get quotations by creator
    const quotationsByCreator = await Quotation.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $unwind: "$creator",
      },
      {
        $group: {
          _id: "$creator._id",
          name: { $first: "$creator.name" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ])

    res.status(200).json({
      success: true,
      report: {
        dateRange: {
          start,
          end,
        },
        totalQuotations: await Quotation.countDocuments(query),
        totalAmount:
          (
            await Quotation.aggregate([
              {
                $match: query,
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: "$total" },
                },
              },
            ])
          )[0]?.total || 0,
        quotationsByStatus: quotationsByStatus.reduce((acc, curr) => {
          acc[curr._id] = {
            count: curr.count,
            totalAmount: curr.totalAmount,
          }
          return acc
        }, {}),
        quotationsByMonth: monthlyData,
        quotationsByCreator,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get conversion report
export const getConversionReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1))
    const end = endDate ? new Date(endDate) : new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createError(400, "Invalid date format"))
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999)

    // Build query
    const query = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    }

    // Access control based on user role
    if (req.user.role === "employee") {
      query.assignedTo = req.user.id
    }

    // Get total leads
    const totalLeads = await Lead.countDocuments(query)

    // Get leads with quotations
    const leadsWithQuotations = await Quotation.distinct("lead", {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    })

    // Get leads with accepted quotations
    const leadsWithAcceptedQuotations = await Quotation.distinct("lead", {
      createdAt: {
        $gte: start,
        $lte: end,
      },
      status: "accepted",
    })

    // Calculate conversion rates
    const leadToQuotationRate = totalLeads > 0 ? (leadsWithQuotations.length / totalLeads) * 100 : 0
    const quotationToSaleRate =
      leadsWithQuotations.length > 0 ? (leadsWithAcceptedQuotations.length / leadsWithQuotations.length) * 100 : 0
    const overallConversionRate = totalLeads > 0 ? (leadsWithAcceptedQuotations.length / totalLeads) * 100 : 0

    // Get conversion rates by month
    const monthlyData = []
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Create a map of all months in the date range
    const startMonth = start.getMonth()
    const startYear = start.getFullYear()
    const endMonth = end.getMonth()
    const endYear = end.getFullYear()

    let currentMonth = startMonth
    let currentYear = startYear

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthStart = new Date(currentYear, currentMonth, 1)
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)

      // Get monthly leads
      const monthlyLeads = await Lead.countDocuments({
        ...query,
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      })

      // Get monthly leads with quotations
      const monthlyLeadsWithQuotations = await Quotation.distinct("lead", {
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      })

      // Get monthly leads with accepted quotations
      const monthlyLeadsWithAcceptedQuotations = await Quotation.distinct("lead", {
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd,
        },
        status: "accepted",
      })

      // Calculate monthly conversion rates
      const monthlyLeadToQuotationRate = monthlyLeads > 0 ? (monthlyLeadsWithQuotations.length / monthlyLeads) * 100 : 0
      const monthlyQuotationToSaleRate =
        monthlyLeadsWithQuotations.length > 0
          ? (monthlyLeadsWithAcceptedQuotations.length / monthlyLeadsWithQuotations.length) * 100
          : 0
      const monthlyOverallConversionRate =
        monthlyLeads > 0 ? (monthlyLeadsWithAcceptedQuotations.length / monthlyLeads) * 100 : 0

      monthlyData.push({
        month: months[currentMonth],
        year: currentYear,
        leadToQuotationRate: monthlyLeadToQuotationRate,
        quotationToSaleRate: monthlyQuotationToSaleRate,
        overallConversionRate: monthlyOverallConversionRate,
      })

      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
    }

    res.status(200).json({
      success: true,
      report: {
        dateRange: {
          start,
          end,
        },
        totalLeads,
        leadsWithQuotations: leadsWithQuotations.length,
        leadsWithAcceptedQuotations: leadsWithAcceptedQuotations.length,
        conversionRates: {
          leadToQuotation: leadToQuotationRate,
          quotationToSale: quotationToSaleRate,
          overall: overallConversionRate,
        },
        monthlyData,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get sales performance report
export const getSalesPerformanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1))
    const end = endDate ? new Date(endDate) : new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createError(400, "Invalid date format"))
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999)

    // Get all sales reps (users)
    let salesReps

    if (req.user.role === "employee") {
      // If employee, only show their own performance
      salesReps = [await User.findById(req.user.id)]
    } else {
      // If admin or manager, show all users
      salesReps = await User.find({
        role: { $in: ["employee", "manager"] },
      })
    }

    // Get performance data for each sales rep
    const performanceData = await Promise.all(
      salesReps.map(async (rep) => {
        // Get leads assigned to this rep
        const leadsAssigned = await Lead.countDocuments({
          assignedTo: rep._id,
          createdAt: {
            $gte: start,
            $lte: end,
          },
        })

        // Get leads with status changes (contacted)
        const leadsContacted = await Lead.countDocuments({
          assignedTo: rep._id,
          status: { $ne: "new" },
          createdAt: {
            $gte: start,
            $lte: end,
          },
        })

        // Get quotations created by this rep
        const quotationsSent = await Quotation.countDocuments({
          createdBy: rep._id,
          createdAt: {
            $gte: start,
            $lte: end,
          },
        })

        // Get accepted quotations
        const salesClosed = await Quotation.countDocuments({
          createdBy: rep._id,
          status: "accepted",
          createdAt: {
            $gte: start,
            $lte: end,
          },
        })

        // Get total revenue
        const revenueData = await Quotation.aggregate([
          {
            $match: {
              createdBy: rep._id,
              status: "accepted",
              createdAt: {
                $gte: start,
                $lte: end,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$total" },
            },
          },
        ])

        const revenue = revenueData[0]?.total || 0

        // Calculate conversion rate
        const conversionRate = leadsAssigned > 0 ? (salesClosed / leadsAssigned) * 100 : 0

        // Set a target (this would come from a real target setting system in a production app)
        const target = 50000 // Example target

        return {
          salesRep: {
            id: rep._id,
            name: rep.name,
            email: rep.email,
          },
          leadsAssigned,
          leadsContacted,
          quotationsSent,
          salesClosed,
          conversionRate,
          revenue,
          target,
          performance:
            conversionRate >= 30
              ? "Excellent"
              : conversionRate >= 20
                ? "Good"
                : conversionRate >= 10
                  ? "Average"
                  : "Needs Improvement",
        }
      }),
    )

    res.status(200).json({
      success: true,
      report: {
        dateRange: {
          start,
          end,
        },
        performanceData,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    // Build query based on user role
    const query = {}
    if (req.user.role === "employee") {
      query.assignedTo = req.user.id
    }

    // Get total leads
    const totalLeads = await Lead.countDocuments(query)

    // Get new leads (created in the last 7 days)
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)

    const newLeads = await Lead.countDocuments({
      ...query,
      createdAt: { $gte: lastWeek },
    })

    // Get total quotations
    const quotationQuery = {}
    if (req.user.role === "employee") {
      quotationQuery.createdBy = req.user.id
    }

    const totalQuotations = await Quotation.countDocuments(quotationQuery)

    // Calculate conversion rate
    const acceptedQuotations = await Quotation.countDocuments({
      ...quotationQuery,
      status: "accepted",
    })

    const conversionRate = totalLeads > 0 ? (acceptedQuotations / totalLeads) * 100 : 0

    res.status(200).json({
      success: true,
      stats: {
        totalLeads,
        newLeads,
        totalQuotations,
        conversionRate,
      },
    })
  } catch (error) {
    next(error)
  }
}
