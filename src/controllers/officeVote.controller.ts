import { Request, Response } from "express";
import OfficeVoteModel from "../models/officeVote.model";
import OfficeModel from "../models/office.model";

// Vote on an office
export const voteOnOffice = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const { vote_type } = req.body;
    const userId = (req as any).user.user_id;

    // Check if vote type is valid
    if (!["upvote", "downvote"].includes(vote_type)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid vote type. Must be 'upvote' or 'downvote'",
      });
    }

    // Check if office exists
    const office = await OfficeModel.findById(officeId);
    if (!office) {
      return res.status(404).json({
        status: "error",
        message: "Office not found",
      });
    }

    // Create or update vote
    const vote = await OfficeVoteModel.create({
      user_id: userId,
      office_id: officeId,
      vote_type,
    });

    // Get updated vote counts from the offices table
    const updatedOffice = await OfficeModel.findById(officeId);

    if (!updatedOffice) {
      return res.status(404).json({
        status: "error",
        message: "Office not found after vote",
      });
    }

    // Create vote counts object from office data
    const voteCounts = {
      upvotes: updatedOffice.upvote_count || 0,
      downvotes: updatedOffice.downvote_count || 0,
      total:
        (updatedOffice.upvote_count || 0) + (updatedOffice.downvote_count || 0),
      ratio:
        updatedOffice.upvote_count !== undefined &&
        updatedOffice.upvote_count > 0
          ? Math.round(
              (updatedOffice.upvote_count /
                ((updatedOffice.upvote_count || 0) +
                  (updatedOffice.downvote_count || 0))) *
                100
            )
          : 0,
    };

    return res.status(200).json({
      status: "success",
      data: {
        vote,
        counts: voteCounts,
      },
    });
  } catch (error) {
    console.error("Error in voteOnOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Remove vote from an office
export const removeVote = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const userId = (req as any).user.user_id;

    // Check if vote exists
    const vote = await OfficeVoteModel.findByUserAndOffice(userId, officeId);
    if (!vote) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    // Delete vote
    const deleted = await OfficeVoteModel.deleteByUserAndOffice(
      userId,
      officeId
    );

    if (!deleted) {
      return res.status(400).json({
        status: "error",
        message: "Failed to remove vote",
      });
    }

    // Get updated vote counts from the offices table
    const updatedOffice = await OfficeModel.findById(officeId);

    if (!updatedOffice) {
      return res.status(404).json({
        status: "error",
        message: "Office not found after vote removal",
      });
    }

    // Create vote counts object from office data
    const voteCounts = {
      upvotes: updatedOffice.upvote_count || 0,
      downvotes: updatedOffice.downvote_count || 0,
      total:
        (updatedOffice.upvote_count || 0) + (updatedOffice.downvote_count || 0),
      ratio:
        updatedOffice.upvote_count !== undefined &&
        updatedOffice.upvote_count > 0
          ? Math.round(
              (updatedOffice.upvote_count /
                ((updatedOffice.upvote_count || 0) +
                  (updatedOffice.downvote_count || 0))) *
                100
            )
          : 0,
    };

    return res.status(200).json({
      status: "success",
      message: "Vote removed successfully",
      data: {
        counts: voteCounts,
      },
    });
  } catch (error) {
    console.error("Error in removeVote:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get votes for an office
export const getVotesByOffice = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;

    // Check if office exists
    const office = await OfficeModel.findById(officeId);
    if (!office) {
      return res.status(404).json({
        status: "error",
        message: "Office not found",
      });
    }

    // Get vote counts from the offices table
    // Create vote counts object from office data
    const voteCounts = {
      upvotes: office.upvote_count || 0,
      downvotes: office.downvote_count || 0,
      total: (office.upvote_count || 0) + (office.downvote_count || 0),
      ratio:
        office.upvote_count !== undefined && office.upvote_count > 0
          ? Math.round(
              (office.upvote_count /
                ((office.upvote_count || 0) + (office.downvote_count || 0))) *
                100
            )
          : 0,
    };

    // Check if user is authenticated to get their vote
    let userVote = null;
    if (req.user) {
      const userId = (req as any).user.user_id;
      userVote = await OfficeVoteModel.findByUserAndOffice(userId, officeId);
    }

    return res.status(200).json({
      status: "success",
      data: {
        counts: voteCounts,
        user_vote: userVote,
      },
    });
  } catch (error) {
    console.error("Error in getVotesByOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get user's vote statistics
export const getUserVoteStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    // Get user vote statistics
    const stats = await OfficeVoteModel.getUserVoteStats(userId);

    return res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("Error in getUserVoteStats:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get top voted offices
export const getTopVotedOffices = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const voteType =
      (req.query.type as "upvote" | "downvote" | "total") || "total";

    // Get top voted offices
    const offices = await OfficeVoteModel.getTopVotedOffices(limit, voteType);

    return res.status(200).json({
      status: "success",
      data: {
        offices,
      },
    });
  } catch (error) {
    console.error("Error in getTopVotedOffices:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get vote trends
export const getVoteTrends = async (req: Request, res: Response) => {
  try {
    const officeId = (req.query.office_id as string) || null;
    const period =
      (req.query.period as "daily" | "weekly" | "monthly") || "daily";
    const limit = parseInt(req.query.limit as string) || 30;

    // Get vote trends
    const trends = await OfficeVoteModel.getVoteTrends(officeId, period, limit);

    return res.status(200).json({
      status: "success",
      data: {
        trends,
      },
    });
  } catch (error) {
    console.error("Error in getVoteTrends:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
