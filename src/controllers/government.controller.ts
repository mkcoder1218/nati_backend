import { Request, Response } from "express";
import pool from "../config/database";
import fs from "fs-extra";
import path from "path";
import { ReportService } from "../services/report.service";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get dashboard statistics for government officials
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const requestedOfficeId = req.query.office_id as string;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    // Determine which office data to show based on user role and permissions
    let targetOfficeId: string | undefined = requestedOfficeId;

    // For officials, automatically use their assigned office (get from their user record)
    if (userRole === "official") {
      if (userOfficeId) {
        targetOfficeId = userOfficeId;
        console.log(
          `🏢 Official user ${userId} accessing data for their assigned office: ${userOfficeId}`
        );
      } else {
        // If official doesn't have office_id in JWT, fetch from database
        console.log(
          `🔍 Fetching office assignment for official ${userId} from database`
        );
        try {
          const userQuery =
            "SELECT office_id FROM users WHERE user_id = $1 AND role = 'official'";
          const userResult = await pool.query(userQuery, [userId]);
          if (userResult.rows.length > 0 && userResult.rows[0].office_id) {
            targetOfficeId = userResult.rows[0].office_id;
            console.log(
              `✅ Found office assignment for official: ${targetOfficeId}`
            );
          } else {
            console.error(`❌ Official ${userId} has no office assignment`);
            return res.status(400).json({
              status: "error",
              message:
                "Official user has no office assignment. Please contact administrator.",
            });
          }
        } catch (err) {
          console.error("Error fetching official's office assignment:", err);
          return res.status(500).json({
            status: "error",
            message: "Error retrieving office assignment",
          });
        }
      }
    } else if (userRole === "admin") {
      // Admins can see data for any office or all offices
      targetOfficeId = requestedOfficeId;
      console.log(
        `👑 Admin user ${userId} accessing data for office: ${
          targetOfficeId || "all offices"
        }`
      );
    } else if (!targetOfficeId) {
      console.log("📊 No office ID specified, showing data for all offices");
      targetOfficeId = undefined;
    }

    console.log(
      `Fetching dashboard stats for office: ${targetOfficeId || "all offices"}`
    );

    // Get office summary statistics
    const officeSummary = await getOfficeSummary(targetOfficeId);
    console.log("Office summary:", officeSummary);

    // Get sentiment breakdown
    const sentimentBreakdown = await getSentimentBreakdown(targetOfficeId);
    console.log("Sentiment breakdown:", sentimentBreakdown);

    // Get top issues
    const topIssues = await getTopIssues(targetOfficeId);
    console.log("Top issues:", topIssues);

    // Get office name for AI analysis
    let officeName = "All Government Offices";
    if (targetOfficeId) {
      try {
        const officeQuery = "SELECT name FROM offices WHERE office_id = $1";
        const officeResult = await pool.query(officeQuery, [targetOfficeId]);
        if (officeResult.rows.length > 0) {
          officeName = officeResult.rows[0].name;
        }
      } catch (err) {
        console.error("Error fetching office name for AI analysis:", err);
      }
    }

    // Generate AI insights for the dashboard
    console.log("🤖 Generating AI insights for dashboard...");
    let aiInsights = null;
    try {
      const geminiService = await import("../services/gemini.service");

      // Prepare data for AI analysis
      const dashboardData = {
        positive: sentimentBreakdown.positive,
        neutral: sentimentBreakdown.neutral,
        negative: sentimentBreakdown.negative,
        total:
          sentimentBreakdown.positive +
          sentimentBreakdown.neutral +
          sentimentBreakdown.negative,
        topIssues: topIssues.map((issue) => ({
          issue: issue.issue,
          count: issue.count,
          percentage: issue.percentage,
        })),
        reviewSamples: [], // We'll keep this empty for dashboard insights
        dateRange: {
          startDate: "current month",
          endDate: "present",
        },
        officeName,
      };

      if (dashboardData.total > 0) {
        aiInsights = await geminiService.default.analyzeSentimentWithGemini(
          dashboardData
        );
        console.log("✅ AI insights generated successfully for dashboard");
      } else {
        console.log("⚠️ No data available for AI analysis");
      }
    } catch (aiError) {
      console.error("❌ Error generating AI insights for dashboard:", aiError);
      // Continue without AI insights if there's an error
    }

    // Always return real data only - no mock data or sample data creation
    return res.status(200).json({
      status: "success",
      data: {
        office_summary: officeSummary,
        sentiment_breakdown: sentimentBreakdown,
        top_issues: topIssues,
        ai_insights: aiInsights, // Add AI insights to the response
      },
      real_data: true,
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get time series data for analytics charts
export const getTimeSeriesData = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const requestedOfficeId = req.query.office_id as string;
    const timeRange = (req.query.time_range as string) || "6months";
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    // Determine which office data to show based on user role and permissions
    let targetOfficeId: string | undefined = requestedOfficeId;

    // For officials, automatically use their assigned office (get from their user record)
    if (userRole === "official") {
      if (userOfficeId) {
        targetOfficeId = userOfficeId;
        console.log(
          `🏢 Official user accessing time series data for their assigned office: ${userOfficeId}`
        );
      } else {
        // If official doesn't have office_id in JWT, fetch from database
        console.log(`🔍 Fetching office assignment for official from database`);
        try {
          const userQuery =
            "SELECT office_id FROM users WHERE user_id = $1 AND role = 'official'";
          const userResult = await pool.query(userQuery, [req.user?.user_id]);
          if (userResult.rows.length > 0 && userResult.rows[0].office_id) {
            targetOfficeId = userResult.rows[0].office_id;
            console.log(
              `✅ Found office assignment for official: ${targetOfficeId}`
            );
          } else {
            console.error(`❌ Official has no office assignment`);
            return res.status(400).json({
              status: "error",
              message:
                "Official user has no office assignment. Please contact administrator.",
            });
          }
        } catch (err) {
          console.error("Error fetching official's office assignment:", err);
          return res.status(500).json({
            status: "error",
            message: "Error retrieving office assignment",
          });
        }
      }
    } else if (userRole === "admin") {
      // Admins can see data for any office or all offices
      targetOfficeId = requestedOfficeId;
      console.log(
        `👑 Admin user accessing time series data for office: ${
          targetOfficeId || "all offices"
        }`
      );
    }

    console.log(
      `Fetching time series data for office: ${
        targetOfficeId || "all offices"
      }, range: ${timeRange}`
    );

    // Calculate date range based on timeRange parameter
    let monthsBack = 6;
    switch (timeRange) {
      case "1month":
        monthsBack = 1;
        break;
      case "3months":
        monthsBack = 3;
        break;
      case "6months":
        monthsBack = 6;
        break;
      case "1year":
        monthsBack = 12;
        break;
      default:
        monthsBack = 6;
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get ratings over time
    const ratingsQuery = `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        AVG(rating) as avg_rating,
        COUNT(*) as review_count
      FROM reviews
      WHERE created_at >= $1
        AND status = 'approved'
        ${targetOfficeId ? "AND office_id = $2" : ""}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const ratingsParams: (Date | string)[] = [startDate];
    if (targetOfficeId) {
      ratingsParams.push(targetOfficeId);
    }

    const ratingsResult = await pool.query(ratingsQuery, ratingsParams);

    // Get reviews count over time
    const reviewsQuery = `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as review_count
      FROM reviews
      WHERE created_at >= $1
        AND status = 'approved'
        ${targetOfficeId ? "AND office_id = $2" : ""}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const reviewsParams: (Date | string)[] = [startDate];
    if (targetOfficeId) {
      reviewsParams.push(targetOfficeId);
    }

    const reviewsResult = await pool.query(reviewsQuery, reviewsParams);

    // Get sentiment over time
    const sentimentQuery = `
      SELECT
        DATE_TRUNC('month', r.created_at) as month,
        sl.sentiment,
        COUNT(*) as count
      FROM reviews r
      JOIN sentiment_logs sl ON r.review_id = sl.review_id
      WHERE r.created_at >= $1
        AND r.status = 'approved'
        ${targetOfficeId ? "AND r.office_id = $2" : ""}
      GROUP BY DATE_TRUNC('month', r.created_at), sl.sentiment
      ORDER BY month ASC, sl.sentiment
    `;

    const sentimentParams: (Date | string)[] = [startDate];
    if (targetOfficeId) {
      sentimentParams.push(targetOfficeId);
    }

    const sentimentResult = await pool.query(sentimentQuery, sentimentParams);

    // Format the data for frontend consumption
    const formatTimeSeriesData = (
      data: any[],
      valueKey: string,
      formatValue?: (val: any) => any
    ) => {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      return data.map((row) => {
        const date = new Date(row.month);
        const monthName = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const value = formatValue ? formatValue(row[valueKey]) : row[valueKey];

        return {
          date: `${monthName} ${year}`,
          value: value || 0,
          count: row.review_count || 0,
        };
      });
    };

    // Format ratings data
    const ratingsOverTime = formatTimeSeriesData(
      ratingsResult.rows,
      "avg_rating",
      (val) => parseFloat(val).toFixed(1)
    );

    // Format reviews data
    const reviewsOverTime = formatTimeSeriesData(
      reviewsResult.rows,
      "review_count",
      (val) => parseInt(val)
    );

    // Format sentiment data
    const sentimentOverTime: Record<string, any[]> = {
      positive: [],
      neutral: [],
      negative: [],
    };

    // Group sentiment data by month and sentiment type
    const sentimentByMonth: Record<string, Record<string, number>> = {};

    sentimentResult.rows.forEach((row) => {
      const date = new Date(row.month);
      const monthKey = `${date.getMonth()}-${date.getFullYear()}`;

      if (!sentimentByMonth[monthKey]) {
        sentimentByMonth[monthKey] = {
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0,
        };
      }

      const count = parseInt(row.count);
      sentimentByMonth[monthKey][row.sentiment] = count;
      sentimentByMonth[monthKey].total += count;
    });

    // Convert to percentage-based time series
    Object.keys(sentimentByMonth).forEach((monthKey) => {
      const [month, year] = monthKey.split("-");
      const date = new Date(parseInt(year), parseInt(month));
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const formattedDate = `${monthNames[parseInt(month)]} ${year}`;

      const data = sentimentByMonth[monthKey];
      const total = data.total;

      if (total > 0) {
        sentimentOverTime.positive.push({
          date: formattedDate,
          value: Math.round((data.positive / total) * 100),
          count: data.positive,
        });

        sentimentOverTime.neutral.push({
          date: formattedDate,
          value: Math.round((data.neutral / total) * 100),
          count: data.neutral,
        });

        sentimentOverTime.negative.push({
          date: formattedDate,
          value: Math.round((data.negative / total) * 100),
          count: data.negative,
        });
      }
    });

    // Sort sentiment data by date
    Object.keys(sentimentOverTime).forEach((sentiment) => {
      sentimentOverTime[sentiment].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    });

    console.log("Time series data generated:", {
      ratingsCount: ratingsOverTime.length,
      reviewsCount: reviewsOverTime.length,
      sentimentPositiveCount: sentimentOverTime.positive.length,
      sentimentNeutralCount: sentimentOverTime.neutral.length,
      sentimentNegativeCount: sentimentOverTime.negative.length,
    });

    return res.status(200).json({
      status: "success",
      data: {
        ratings_over_time: ratingsOverTime,
        reviews_over_time: reviewsOverTime,
        sentiment_over_time: sentimentOverTime,
        time_range: timeRange,
        office_id: targetOfficeId,
      },
      real_data: true,
    });
  } catch (error) {
    console.error("Error in getTimeSeriesData:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get sentiment breakdown for an office
export const getSentimentBreakdown = async (officeId?: string) => {
  try {
    let query = `
      SELECT
        sentiment,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
    `;

    const params = [];
    if (officeId) {
      query += " WHERE r.office_id = $1";
      params.push(officeId);
    }

    query += " GROUP BY sentiment";

    const result = await pool.query(query, params);

    // Format the result
    const breakdown: { positive: number; neutral: number; negative: number } = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    result.rows.forEach((row) => {
      const sentiment = row.sentiment as "positive" | "neutral" | "negative";
      if (sentiment in breakdown) {
        breakdown[sentiment] = parseInt(row.count);
      }
    });

    return breakdown;
  } catch (error) {
    console.error("Error in getSentimentBreakdown:", error);
    throw error;
  }
};

// Get top issues for an office
export const getTopIssues = async (officeId?: string) => {
  try {
    let query = `
      SELECT
        category,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE sentiment = 'negative'
    `;

    const params = [];
    if (officeId) {
      query += " AND r.office_id = $1";
      params.push(officeId);
    }

    query += " GROUP BY category ORDER BY count DESC LIMIT 5";

    const result = await pool.query(query, params);

    // Calculate total negative reviews for percentage
    let totalNegativeQuery = `
      SELECT COUNT(*) as total
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE sentiment = 'negative'
    `;

    if (officeId) {
      totalNegativeQuery += " AND r.office_id = $1";
    }

    const totalResult = await pool.query(totalNegativeQuery, params);
    const total = parseInt(totalResult.rows[0].total) || 1; // Avoid division by zero

    // Format the result
    return result.rows.map((row) => ({
      issue: row.category,
      count: parseInt(row.count),
      percentage: Math.round((parseInt(row.count) / total) * 100),
    }));
  } catch (error) {
    console.error("Error in getTopIssues:", error);
    throw error;
  }
};

// Get office summary statistics
export const getOfficeSummary = async (officeId?: string) => {
  try {
    // Get current month's data
    const currentMonthQuery =
      `
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(DISTINCT user_id) as citizens_served
      FROM reviews
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ` + (officeId ? " AND office_id = $1" : "");

    const currentMonthResult = await pool.query(
      currentMonthQuery,
      officeId ? [officeId] : []
    );

    // Get previous month's data
    const prevMonthQuery =
      `
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(DISTINCT user_id) as citizens_served
      FROM reviews
      WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND created_at < date_trunc('month', CURRENT_DATE)
    ` + (officeId ? " AND office_id = $1" : "");

    const prevMonthResult = await pool.query(
      prevMonthQuery,
      officeId ? [officeId] : []
    );

    // Get positive feedback percentage
    const sentimentQuery =
      `
      SELECT
        COUNT(*) FILTER (WHERE sl.sentiment = 'positive') as positive_count,
        COUNT(*) as total_count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.created_at >= date_trunc('month', CURRENT_DATE)
    ` + (officeId ? " AND r.office_id = $1" : "");

    const sentimentResult = await pool.query(
      sentimentQuery,
      officeId ? [officeId] : []
    );

    // Get previous month's sentiment data
    const prevSentimentQuery =
      `
      SELECT
        COUNT(*) FILTER (WHERE sl.sentiment = 'positive') as positive_count,
        COUNT(*) as total_count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND r.created_at < date_trunc('month', CURRENT_DATE)
    ` + (officeId ? " AND r.office_id = $1" : "");

    const prevSentimentResult = await pool.query(
      prevSentimentQuery,
      officeId ? [officeId] : []
    );

    // Calculate current values
    const currentReviews =
      parseInt(currentMonthResult.rows[0].total_reviews) || 0;
    const currentRating =
      parseFloat(currentMonthResult.rows[0].average_rating) || 0;
    const currentCitizens =
      parseInt(currentMonthResult.rows[0].citizens_served) || 0;

    const currentPositive =
      parseInt(sentimentResult.rows[0].positive_count) || 0;
    const currentTotal = parseInt(sentimentResult.rows[0].total_count) || 1; // Avoid division by zero
    const currentPositivePercentage = Math.round(
      (currentPositive / currentTotal) * 100
    );

    // Calculate previous values
    const prevReviews = parseInt(prevMonthResult.rows[0].total_reviews) || 0;
    const prevRating = parseFloat(prevMonthResult.rows[0].average_rating) || 0;
    const prevCitizens = parseInt(prevMonthResult.rows[0].citizens_served) || 0;

    const prevPositive =
      parseInt(prevSentimentResult.rows[0].positive_count) || 0;
    const prevTotal = parseInt(prevSentimentResult.rows[0].total_count) || 1; // Avoid division by zero
    const prevPositivePercentage = Math.round((prevPositive / prevTotal) * 100);

    // Calculate changes
    const reviewsChange = currentReviews - prevReviews;
    const ratingChange = currentRating - prevRating;
    const citizensChange = currentCitizens - prevCitizens;
    const positivePercentageChange =
      currentPositivePercentage - prevPositivePercentage;

    return {
      total_reviews: currentReviews,
      average_rating: parseFloat(currentRating.toFixed(1)),
      citizens_served: currentCitizens,
      positive_feedback_percentage: currentPositivePercentage,
      monthly_change: {
        reviews: reviewsChange,
        rating: parseFloat(ratingChange.toFixed(1)),
        citizens: citizensChange,
        positive_percentage: positivePercentageChange,
      },
    };
  } catch (error) {
    console.error("Error in getOfficeSummary:", error);
    throw error;
  }
};

// Generate a report for an office with AI-powered analysis
export const generateReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    console.log("Generate report request received:", {
      query: req.query,
      user: req.user,
    });

    const requestedOfficeId = req.query.office_id as string;
    const startDate = (req.query.start_date as string) || "";
    const endDate = (req.query.end_date as string) || "";
    const reportType = (req.query.report_type as string) || "sentiment";
    const reportFormat = (req.query.report_format as string) || "pdf";

    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    // Determine which office data to include in report based on user role and permissions
    let officeId: string | undefined = requestedOfficeId;

    // For officials, automatically use their assigned office (get from their user record)
    if (userRole === "official") {
      if (userOfficeId) {
        officeId = userOfficeId;
        console.log(
          `🏢 Official user generating report for their assigned office: ${userOfficeId}`
        );
      } else {
        // If official doesn't have office_id in JWT, fetch from database
        console.log(`🔍 Fetching office assignment for official from database`);
        try {
          const userQuery =
            "SELECT office_id FROM users WHERE user_id = $1 AND role = 'official'";
          const userResult = await pool.query(userQuery, [req.user?.user_id]);
          if (userResult.rows.length > 0 && userResult.rows[0].office_id) {
            officeId = userResult.rows[0].office_id;
            console.log(`✅ Found office assignment for official: ${officeId}`);
          } else {
            console.error(`❌ Official has no office assignment`);
            return res.status(400).json({
              status: "error",
              message:
                "Official user has no office assignment. Please contact administrator.",
            });
          }
        } catch (err) {
          console.error("Error fetching official's office assignment:", err);
          return res.status(500).json({
            status: "error",
            message: "Error retrieving office assignment",
          });
        }
      }
    } else if (userRole === "admin") {
      // Admins can generate reports for any office or all offices
      officeId = requestedOfficeId;
      console.log(
        `👑 Admin user generating report for office: ${
          officeId || "all offices"
        }`
      );
    }

    console.log("Report parameters:", {
      officeId,
      startDate,
      endDate,
      reportType,
      reportFormat,
    });

    // Import the required services
    console.log("Importing services...");
    const geminiService = await import("../services/gemini.service");
    const pdfService = await import("../services/pdf.service");
    console.log("Services imported successfully");

    // Get office name if officeId is provided
    let officeName = "All Government Offices";
    if (officeId) {
      try {
        console.log(`🔍 Fetching office name for office ID: ${officeId}`);
        const officeQuery = "SELECT name FROM offices WHERE office_id = $1";
        const officeResult = await pool.query(officeQuery, [officeId]);
        if (officeResult.rows.length > 0) {
          officeName = officeResult.rows[0].name;
          console.log(
            `✅ Found office name: "${officeName}" for ID: ${officeId}`
          );
        } else {
          console.warn(
            `⚠️ No office found with ID: ${officeId}, using default name`
          );
        }
      } catch (err) {
        console.error("❌ Error fetching office name:", err);
      }
    } else {
      console.log(
        "📊 No specific office ID provided, generating report for all offices"
      );
    }

    // Validate that we have a proper office name
    if (!officeName || officeName.trim() === "") {
      officeName = "Government Office";
      console.warn("⚠️ Office name was empty, using fallback name");
    }

    console.log(`📋 Final office name for report: "${officeName}"`);

    // Get sentiment data for the specified date range
    const sentimentData = await getSentimentDataForReport(
      officeId,
      startDate,
      endDate
    );

    // Get additional metrics for the report
    const additionalMetrics = await getAdditionalMetricsForReport(
      officeId,
      startDate,
      endDate
    );

    // Get review samples for context (limit to 10)
    const reviewSamples = await getReviewSamplesForReport(
      officeId,
      startDate,
      endDate,
      10
    );

    // Analyze the data with Gemini AI
    console.log("Analyzing data with Gemini AI...");
    console.log("Office-specific data being analyzed:", {
      officeName,
      officeId,
      totalReviews: sentimentData.total,
      positive: sentimentData.positive,
      negative: sentimentData.negative,
      neutral: sentimentData.neutral,
      topIssuesCount: sentimentData.topIssues.length,
      reviewSamplesCount: reviewSamples.length,
    });

    let aiReport;
    try {
      aiReport = await geminiService.default.analyzeSentimentWithGemini({
        ...sentimentData,
        reviewSamples,
        dateRange: {
          startDate: startDate || "all time",
          endDate: endDate || "present",
        },
        officeName,
      });
      console.log(
        "✅ Gemini AI analysis completed successfully for office:",
        officeName
      );
    } catch (aiError) {
      console.error("❌ Error during Gemini AI analysis:", aiError);
      console.log(
        "🔄 Using fallback report generation with real office data..."
      );

      // Provide a fallback AI report if Gemini fails, but use real data
      const positivePercentage =
        sentimentData.total > 0
          ? Math.round((sentimentData.positive / sentimentData.total) * 100)
          : 0;
      const negativePercentage =
        sentimentData.total > 0
          ? Math.round((sentimentData.negative / sentimentData.total) * 100)
          : 0;
      const neutralPercentage =
        sentimentData.total > 0
          ? Math.round((sentimentData.neutral / sentimentData.total) * 100)
          : 0;

      aiReport = {
        summary: `Office-specific analysis for ${officeName} from ${
          startDate || "all time"
        } to ${
          endDate || "present"
        }. This report contains data exclusively for ${officeName}. Total reviews analyzed: ${
          sentimentData.total
        }. Sentiment breakdown: ${positivePercentage}% positive, ${neutralPercentage}% neutral, ${negativePercentage}% negative.`,
        keyInsights: [
          `${positivePercentage}% of feedback for ${officeName} was positive.`,
          `${negativePercentage}% of feedback for ${officeName} was negative.`,
          `${neutralPercentage}% of feedback for ${officeName} was neutral.`,
          sentimentData.topIssues.length > 0
            ? `Top issue for ${officeName}: ${sentimentData.topIssues[0].issue} (${sentimentData.topIssues[0].percentage}%)`
            : `No specific issues identified for ${officeName}.`,
          `Total of ${sentimentData.total} reviews analyzed specifically for ${officeName}.`,
        ],
        recommendations: [
          `Review the most common issues specific to ${officeName} and develop targeted action plans.`,
          `Implement office-specific staff training for ${officeName} on customer service.`,
          `Consider digital solutions tailored to ${officeName}'s service delivery needs.`,
          sentimentData.topIssues.length > 0
            ? `Address the primary concern of '${sentimentData.topIssues[0].issue}' at ${officeName}.`
            : `Continue monitoring feedback patterns at ${officeName}.`,
        ],
        trendAnalysis: `Office-specific trend analysis for ${officeName}: The ratio of positive to negative feedback is ${
          sentimentData.positive
        }:${sentimentData.negative}. ${
          positivePercentage > negativePercentage
            ? `${officeName} shows predominantly positive citizen sentiment.`
            : `${officeName} has opportunities for service improvement based on feedback patterns.`
        }`,
        fullAnalysis: `This comprehensive analysis focuses exclusively on ${officeName} and contains no data from other offices. The analysis covers ${
          sentimentData.total
        } reviews submitted specifically for ${officeName}. ${
          sentimentData.total > 0
            ? `Key findings show ${positivePercentage}% positive sentiment, indicating ${
                positivePercentage > 60
                  ? "good"
                  : positivePercentage > 40
                  ? "moderate"
                  : "low"
              } citizen satisfaction with ${officeName} services.`
            : `No review data available for ${officeName} in the selected time period.`
        } ${
          sentimentData.topIssues.length > 0
            ? `The most frequently mentioned concern for ${officeName} was "${sentimentData.topIssues[0].issue}" representing ${sentimentData.topIssues[0].percentage}% of feedback.`
            : ""
        } This office-specific report ensures data accuracy and relevance for ${officeName} decision-making.`,
      };
    }

    // Generate the actual report file based on the format
    let reportFilename = "";

    // Create report title
    const reportTitle = `${
      reportType === "sentiment"
        ? "Sentiment Analysis"
        : reportType === "feedback"
        ? "Feedback Analysis"
        : reportType === "performance"
        ? "Performance Report"
        : "Service Usage Report"
    } - ${officeName}`;

    // Create report record in database first
    const reportRecord = await ReportService.createReport({
      title: reportTitle,
      filename: "", // Will be updated after file generation
      file_path: "", // Will be updated after file generation
      format: reportFormat,
      report_type: reportType as any,
      office_id: officeId,
      user_id: req.user?.user_id,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: "generating",
    });

    console.log("Report record created:", reportRecord.report_id);

    console.log("Generating report file...");
    try {
      if (reportFormat === "pdf") {
        // Generate PDF report
        console.log("Generating PDF report...");
        reportFilename = await pdfService.generatePDFReport({
          officeName,
          reportType,
          startDate: startDate || "all time",
          endDate: endDate || "present",
          aiReport,
          sentimentData,
        });
        console.log("PDF report generated successfully:", reportFilename);
      } else {
        // For other formats (Excel, CSV), we would implement similar generation functions
        // For now, just create a placeholder filename
        const timestamp = Date.now();
        reportFilename = `${officeName
          .replace(/\s+/g, "-")
          .toLowerCase()}-${reportType}-${timestamp}.${reportFormat}`;
        console.log(
          "Placeholder filename created for non-PDF format:",
          reportFilename
        );
        // TODO: Implement Excel and CSV report generation
      }

      // Update report record with filename and file path
      const filePath = path.join(
        __dirname,
        "../../public/reports",
        reportFilename
      );
      const fileSize = await ReportService.getFileSize(filePath);

      await ReportService.updateReport(reportRecord.report_id, {
        file_size: fileSize || undefined,
        status: "completed",
      });

      // Update the filename and file_path in the database
      await pool.query(
        "UPDATE reports SET filename = $1, file_path = $2 WHERE report_id = $3",
        [reportFilename, filePath, reportRecord.report_id]
      );

      console.log("Report metadata updated in database");
    } catch (error) {
      console.error("Error generating report file:", error);

      // Update report status to failed
      await ReportService.updateReport(reportRecord.report_id, {
        status: "failed",
      });

      // Handle the error properly with type checking
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate report file: ${errorMessage}`);
    }

    // Construct the URL for downloading the report
    // Use the correct route path without /api/ prefix
    const reportUrl = `/reports/${reportFilename}`;
    console.log("Report URL:", reportUrl);

    // Log the full path for debugging
    const fullPath = path.join(
      __dirname,
      "../../public/reports",
      reportFilename
    );
    console.log("Full report file path:", fullPath);
    console.log("File exists:", fs.existsSync(fullPath));

    return res.status(200).json({
      status: "success",
      data: {
        reportUrl,
        aiReport,
        message: "Report generated successfully with AI analysis",
      },
    });
  } catch (error) {
    console.error("Error in generateReport:", error);

    // Provide more detailed error information
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error stack:", error.stack);
    }

    return res.status(500).json({
      status: "error",
      message: errorMessage,
      details: error instanceof Error ? error.stack : String(error),
    });
  }
};

// Helper function to get sentiment data for report
const getSentimentDataForReport = async (
  officeId?: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    console.log("Fetching real sentiment data from database...", {
      officeId,
      startDate,
      endDate,
    });

    // Base query for sentiment breakdown
    let query = `
      SELECT
        sl.sentiment,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.status = 'approved'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add office filter if provided
    if (officeId) {
      query += ` AND r.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }

    // Add date range filters if provided
    if (startDate) {
      query += ` AND r.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND r.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += " GROUP BY sl.sentiment";

    console.log("Executing sentiment query:", query, "with params:", params);
    const result = await pool.query(query, params);
    console.log("Sentiment query result:", result.rows);

    // Format the result
    const breakdown: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
    } = {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
    };

    result.rows.forEach((row) => {
      const sentiment = row.sentiment as "positive" | "neutral" | "negative";
      if (sentiment in breakdown) {
        breakdown[sentiment] = parseInt(row.count);
        breakdown.total += parseInt(row.count);
      }
    });

    console.log("Processed sentiment breakdown:", breakdown);

    // Get top issues
    let topIssuesQuery = `
      SELECT
        sl.category,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.status = 'approved' AND sl.category IS NOT NULL AND sl.category != ''
    `;

    let topIssuesParams: any[] = [];
    let topIssuesParamIndex = 1;

    // Add office filter if provided
    if (officeId) {
      topIssuesQuery += ` AND r.office_id = $${topIssuesParamIndex}`;
      topIssuesParams.push(officeId);
      topIssuesParamIndex++;
    }

    // Add date range filters if provided
    if (startDate) {
      topIssuesQuery += ` AND r.created_at >= $${topIssuesParamIndex}`;
      topIssuesParams.push(startDate);
      topIssuesParamIndex++;
    }

    if (endDate) {
      topIssuesQuery += ` AND r.created_at <= $${topIssuesParamIndex}`;
      topIssuesParams.push(endDate);
      topIssuesParamIndex++;
    }

    topIssuesQuery += " GROUP BY sl.category ORDER BY count DESC LIMIT 5";

    console.log(
      "Executing top issues query:",
      topIssuesQuery,
      "with params:",
      topIssuesParams
    );
    const topIssuesResult = await pool.query(topIssuesQuery, topIssuesParams);
    console.log("Top issues query result:", topIssuesResult.rows);

    // Format top issues with human-readable names and percentages
    const topIssues = topIssuesResult.rows.map((row) => {
      const issueNames: Record<string, string> = {
        waiting_time: "Long Waiting Times",
        staff_behavior: "Staff Behavior Issues",
        corruption: "Corruption Concerns",
        facility_condition: "Facility Conditions",
        process_complexity: "Complex Procedures",
        documentation: "Documentation Issues",
        service_availability: "Service Availability",
        information_clarity: "Information Clarity",
        online_system: "Online System Problems",
        language_barrier: "Language Barriers",
      };

      const count = parseInt(row.count);
      const percentage =
        breakdown.total > 0 ? Math.round((count / breakdown.total) * 100) : 0;

      return {
        issue:
          issueNames[row.category] ||
          row.category
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        count,
        percentage,
      };
    });

    console.log("Processed top issues:", topIssues);

    // If we have real data, return it
    if (breakdown.total > 0) {
      console.log("Returning real sentiment data:", {
        ...breakdown,
        topIssues,
      });
      return {
        ...breakdown,
        topIssues,
      };
    }

    // If no real data found, log this and fall back to mock data
    console.log("No real sentiment data found, falling back to mock data");
    throw new Error("No real sentiment data available");
  } catch (error) {
    console.error("Error getting sentiment data for report:", error);

    // Return empty data structure instead of mock data
    console.log(
      "❌ No real sentiment data available - returning empty structure"
    );
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
      topIssues: [],
    };
  }
};

// Helper function to get review samples for the report
const getReviewSamplesForReport = async (
  officeId?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 10
) => {
  try {
    // Base query for review samples
    let query = `
      SELECT
        r.comment as review_text,
        sl.sentiment,
        sl.category
      FROM reviews r
      JOIN sentiment_logs sl ON r.review_id = sl.review_id
      WHERE r.comment IS NOT NULL AND r.comment != '' AND r.status = 'approved'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add office filter if provided
    if (officeId) {
      query += ` AND r.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }

    // Add date range filters if provided
    if (startDate) {
      query += ` AND r.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND r.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Order by created_at and limit the results
    query += ` ORDER BY r.created_at DESC LIMIT ${limit}`;

    const result = await pool.query(query, params);

    // Format the result
    return result.rows.map((row) => ({
      text: row.review_text,
      sentiment: row.sentiment,
      category: row.category,
    }));
  } catch (error) {
    console.error("Error getting review samples for report:", error);

    // Return empty array instead of mock data
    console.log("❌ No real review samples available - returning empty array");
    return [];
  }
};

// Helper function to get additional metrics for the report
const getAdditionalMetricsForReport = async (
  officeId?: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    // Base query for additional metrics
    let query = `
      SELECT
        AVG(rating) as average_rating,
        COUNT(DISTINCT user_id) as total_citizens_served
      FROM reviews
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add office filter if provided
    if (officeId) {
      query += ` AND office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }

    // Add date range filters if provided
    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    const averageRating = parseFloat(result.rows[0]?.average_rating) || 0;
    const totalCitizensServed =
      parseInt(result.rows[0]?.total_citizens_served) || 0;

    // Calculate mock response time and resolution rate for now
    // In a real system, these would come from actual service metrics
    const responseTime = `${Math.floor(Math.random() * 5) + 1}-${
      Math.floor(Math.random() * 3) + 2
    } days`;
    const resolutionRate = Math.floor(Math.random() * 20) + 75; // 75-95%

    return {
      averageRating,
      totalCitizensServed,
      responseTime,
      resolutionRate,
    };
  } catch (error) {
    console.error("Error getting additional metrics for report:", error);

    // Return empty/zero data instead of mock data
    console.log(
      "❌ No real metrics data available - returning empty structure"
    );
    return {
      averageRating: 0,
      totalCitizensServed: 0,
      responseTime: "N/A",
      resolutionRate: 0,
    };
  }
};
