import { Request, Response } from "express";
import ServiceGuideModel from "../models/serviceGuide.model";

// Create a new service guide
export const createServiceGuide = async (req: Request, res: Response) => {
  try {
    const { office_id, title, content, language } = req.body;

    // Validate required fields
    if (!office_id) {
      return res.status(400).json({
        status: "error",
        message: "office_id is required",
      });
    }

    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "title is required",
      });
    }

    if (!content) {
      return res.status(400).json({
        status: "error",
        message: "content is required",
      });
    }

    console.log("Creating service guide with data:", {
      office_id,
      title,
      content: typeof content === 'string' ? content.substring(0, 100) + '...' : content,
      language: language || 'english'
    });

    // Create service guide
    const guide = await ServiceGuideModel.create({
      office_id,
      title,
      content,
      language: language || 'english', // Default to english if not provided
    });

    console.log("Service guide created successfully:", guide.guide_id);

    return res.status(201).json({
      status: "success",
      data: {
        guide,
      },
    });
  } catch (error) {
    console.error("Error in createServiceGuide:", error);

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint')) {
        return res.status(400).json({
          status: "error",
          message: "Invalid office_id - office does not exist",
        });
      }

      if (error.message.includes('duplicate key')) {
        return res.status(409).json({
          status: "error",
          message: "Service guide with this title already exists for this office",
        });
      }
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Get all service guides
export const getAllServiceGuides = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const language = req.query.language as string;

    let guides;

    if (language) {
      guides = await ServiceGuideModel.getByLanguage(language, limit, offset);
    } else {
      guides = await ServiceGuideModel.getAll(limit, offset);
    }

    return res.status(200).json({
      status: "success",
      data: {
        guides,
        count: guides.length,
      },
    });
  } catch (error: any) {
    console.error("Error in getAllServiceGuides:", error);

    // Handle specific database connection errors
    if (
      error.code === "ECONNRESET" ||
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Connection terminated")
    ) {
      return res.status(503).json({
        status: "error",
        message: "Database connection error. Please try again in a moment.",
        code: "DATABASE_CONNECTION_ERROR",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get service guides by office
export const getServiceGuidesByOffice = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const language = req.query.language as string;

    let guides;

    if (language) {
      guides = await ServiceGuideModel.getByOfficeAndLanguage(
        officeId,
        language
      );
    } else {
      guides = await ServiceGuideModel.getByOffice(officeId, limit, offset);
    }

    return res.status(200).json({
      status: "success",
      data: {
        guides,
        count: guides.length,
      },
    });
  } catch (error) {
    console.error("Error in getServiceGuidesByOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get service guide by ID
export const getServiceGuideById = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;

    const guide = await ServiceGuideModel.findById(guideId);
    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Service guide not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        guide,
      },
    });
  } catch (error) {
    console.error("Error in getServiceGuideById:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update service guide
export const updateServiceGuide = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;
    const { title, content, language } = req.body;

    // Check if guide exists
    const existingGuide = await ServiceGuideModel.findById(guideId);
    if (!existingGuide) {
      return res.status(404).json({
        status: "error",
        message: "Service guide not found",
      });
    }

    // Update guide
    const updatedGuide = await ServiceGuideModel.update(guideId, {
      title,
      content,
      language,
    });

    if (!updatedGuide) {
      return res.status(400).json({
        status: "error",
        message: "Failed to update service guide",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        guide: updatedGuide,
      },
    });
  } catch (error) {
    console.error("Error in updateServiceGuide:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete service guide
export const deleteServiceGuide = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;

    // Check if guide exists
    const existingGuide = await ServiceGuideModel.findById(guideId);
    if (!existingGuide) {
      return res.status(404).json({
        status: "error",
        message: "Service guide not found",
      });
    }

    // Delete guide
    const deleted = await ServiceGuideModel.delete(guideId);

    if (!deleted) {
      return res.status(400).json({
        status: "error",
        message: "Failed to delete service guide",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Service guide deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteServiceGuide:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Search service guides
export const searchServiceGuides = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!query) {
      return res.status(400).json({
        status: "error",
        message: "Search query is required",
      });
    }

    const guides = await ServiceGuideModel.search(
      query as string,
      limit,
      offset
    );

    return res.status(200).json({
      status: "success",
      data: {
        guides,
        count: guides.length,
      },
    });
  } catch (error) {
    console.error("Error in searchServiceGuides:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
