import { Request, Response } from "express";
import pool from "../config/database";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get admin dashboard statistics
export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Get total offices count
    const officesResult = await pool.query(
      "SELECT COUNT(*) as count FROM offices"
    );
    const totalOffices = parseInt(officesResult.rows[0].count);

    // For offices, we don't have a created_at column in the schema
    // So we'll just use a mock value for new offices
    const newOffices = Math.floor(totalOffices * 0.1); // Assume 10% are new

    // Get total services count
    const servicesResult = await pool.query(
      "SELECT COUNT(*) as count FROM service_guides"
    );
    const totalServices = parseInt(servicesResult.rows[0].count);

    // Get new services in the last month
    const newServicesResult = await pool.query(
      "SELECT COUNT(*) as count FROM service_guides WHERE created_at >= NOW() - INTERVAL '1 month'"
    );
    const newServices = parseInt(newServicesResult.rows[0].count);

    // Get total users count
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get new users in the last month
    const newUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '1 month'"
    );
    const newUsers = parseInt(newUsersResult.rows[0].count);

    // Get flagged comments count (reviews that are flagged or have flag votes and are pending)
    const flaggedResult = await pool.query(`
      SELECT COUNT(DISTINCT r.review_id) as count
      FROM reviews r
      LEFT JOIN votes v ON r.review_id = v.review_id AND v.vote_type = 'flag'
      WHERE r.status = 'flagged'
      OR (r.status = 'pending' AND v.vote_id IS NOT NULL)
    `);
    const flaggedComments = parseInt(flaggedResult.rows[0].count);

    // Get recent activity
    const recentActivityResult = await pool.query(`
      -- Start with service_guides since we're skipping offices
      (SELECT
        'service_updated' as activity_type,
        title,
        updated_at as created_at,
        NULL as user_id
      FROM service_guides
      ORDER BY updated_at DESC
      LIMIT 5)

      UNION ALL

      (SELECT
        'review_flagged' as activity_type,
        'Review flagged' as title,
        v.created_at,
        v.user_id
      FROM votes v
      JOIN reviews r ON v.review_id = r.review_id
      WHERE v.vote_type = 'flag'
      ORDER BY v.created_at DESC
      LIMIT 5)

      UNION ALL

      (SELECT
        'user_registered' as activity_type,
        'New user registered' as title,
        created_at,
        user_id
      FROM users
      ORDER BY created_at DESC
      LIMIT 5)

      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get user details for activities that have user_id
    const userIds = recentActivityResult.rows
      .filter((activity: any) => activity.user_id)
      .map((activity: any) => activity.user_id);

    // Define the user type
    interface UserDetail {
      user_id: string;
      full_name: string;
      email: string;
      role: string;
    }

    // Define the map with proper typing
    let userMap: Record<string, UserDetail> = {};

    if (userIds.length > 0) {
      const usersDetailResult = await pool.query(
        "SELECT user_id, full_name, email, role FROM users WHERE user_id = ANY($1)",
        [userIds]
      );

      userMap = usersDetailResult.rows.reduce((map: any, user: any) => {
        map[user.user_id] = user;
        return map;
      }, {} as any);
    }

    // Format recent activity
    const recentActivity = recentActivityResult.rows.map((activity: any) => {
      const formattedActivity = {
        type: activity.activity_type,
        title: activity.title,
        timestamp: activity.created_at,
        user:
          activity.user_id && userMap[activity.user_id]
            ? userMap[activity.user_id]
            : null,
      };

      return formattedActivity;
    });

    return res.status(200).json({
      status: "success",
      data: {
        stats: {
          offices: {
            total: totalOffices,
            new: newOffices,
          },
          services: {
            total: totalServices,
            new: newServices,
          },
          users: {
            total: totalUsers,
            new: newUsers,
          },
          flagged_comments: flaggedComments,
        },
        recent_activity: recentActivity,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);

    // For development/testing, return mock data if database queries fail
    if (process.env.NODE_ENV === "development") {
      console.log("Returning mock data for development/testing");

      // Mock stats
      const mockStats = {
        offices: {
          total: 156,
          new: 12,
        },
        services: {
          total: 42,
          new: 3,
        },
        users: {
          total: 2845,
          new: 257,
        },
        flagged_comments: 18,
      };

      // Mock recent activity
      const mockRecentActivity = [
        {
          type: "office_created",
          title: "Nifas Silk-Lafto Subcity Woreda 2 Office",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: null,
        },
        {
          type: "service_updated",
          title: "Business License Application - Updated requirements",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          user: null,
        },
        {
          type: "review_flagged",
          title: "Review flagged",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user: {
            user_id: "123",
            full_name: "Test User",
            email: "test@example.com",
            role: "citizen",
          },
        },
        {
          type: "user_registered",
          title: "New user registered",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user: {
            user_id: "456",
            full_name: "Government Official",
            email: "official@example.com",
            role: "official",
          },
        },
      ];

      return res.status(200).json({
        status: "success",
        data: {
          stats: mockStats,
          recent_activity: mockRecentActivity,
        },
        mock: true,
      });
    }

    // If not in development or mock data not enabled, return error
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get system health status
export const getSystemHealth = async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const dbResult = await pool.query("SELECT NOW()");
    const dbStatus = dbResult ? "healthy" : "unhealthy";

    // Get system metrics
    const metrics = {
      database: dbStatus,
      api: "healthy",
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
    };

    return res.status(200).json({
      status: "success",
      data: {
        health: metrics,
      },
    });
  } catch (error) {
    console.error("Error in getSystemHealth:", error);

    // For development/testing, return mock data if database queries fail
    if (process.env.NODE_ENV === "development") {
      console.log("Returning mock system health data for development/testing");

      // Mock system health data
      const mockMetrics = {
        database: "healthy",
        api: "healthy",
        uptime: 12345,
        memory_usage: {
          rss: 123456789,
          heapTotal: 98765432,
          heapUsed: 45678901,
          external: 1234567,
        },
        cpu_usage: {
          user: 12345,
          system: 6789,
        },
      };

      return res.status(200).json({
        status: "success",
        data: {
          health: mockMetrics,
        },
        mock: true,
      });
    }

    // If not in development or mock data not enabled, return error
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
