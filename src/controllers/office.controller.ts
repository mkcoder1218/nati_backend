import { Request, Response } from "express";
import OfficeModel from "../models/office.model";
import ReviewModel from "../models/review.model";
import UserModel from "../models/user.model";

// Create a new office
export const createOffice = async (req: Request, res: Response) => {
  try {
    const {
      name,
      type,
      latitude,
      longitude,
      address,
      contact_info,
      operating_hours,
      parent_office_id,
      assigned_official_id,
    } = req.body;

    // Create office
    const office = await OfficeModel.create({
      name,
      type,
      latitude,
      longitude,
      address,
      contact_info,
      operating_hours,
      parent_office_id,
    });

    // If an official is assigned, assign them to this office (single office assignment)
    if (assigned_official_id) {
      await UserModel.assignOfficialToOffice(
        assigned_official_id,
        office.office_id
      );
    }

    return res.status(201).json({
      status: "success",
      data: {
        office,
      },
    });
  } catch (error) {
    console.error("Error in createOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all offices
export const getAllOffices = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;
    const parentId = req.query.parent_id as string;

    let offices;

    if (type) {
      offices = await OfficeModel.getByType(type, limit, offset);
    } else if (parentId) {
      offices = await OfficeModel.getByParent(parentId, limit, offset);
    } else {
      offices = await OfficeModel.getAll(limit, offset);
    }

    // Get ratings for each office
    const officesWithRatings = await Promise.all(
      offices.map(async (office) => {
        const averageRating = await ReviewModel.getAverageRatingByOffice(
          office.office_id
        );
        const reviewCount = await ReviewModel.getReviewCountByOffice(
          office.office_id
        );

        return {
          ...office,
          average_rating: averageRating,
          review_count: reviewCount,
        };
      })
    );

    return res.status(200).json({
      status: "success",
      data: {
        offices: officesWithRatings,
        count: officesWithRatings.length,
      },
    });
  } catch (error) {
    console.error("Error in getAllOffices:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get office by ID
export const getOfficeById = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;

    const office = await OfficeModel.findById(officeId);
    if (!office) {
      return res.status(404).json({
        status: "error",
        message: "Office not found",
      });
    }

    // Get office rating
    const averageRating = await ReviewModel.getAverageRatingByOffice(officeId);
    const reviewCount = await ReviewModel.getReviewCountByOffice(officeId);

    // Get assigned officials for this office
    console.log(`Fetching assigned officials for office ${officeId}`);
    const assignedOfficials = await UserModel.findByOfficeId(officeId);
    console.log("Found assigned officials:", assignedOfficials);
    const assignedOfficial =
      assignedOfficials.length > 0 ? assignedOfficials[0] : null;
    console.log("Selected assigned official:", assignedOfficial);

    const responseData = {
      ...office,
      average_rating: averageRating,
      review_count: reviewCount,
      assigned_official_id: assignedOfficial?.user_id,
      assigned_official_name: assignedOfficial?.full_name,
    };
    console.log("Returning office data with assignment info:", responseData);

    return res.status(200).json({
      status: "success",
      data: {
        office: responseData,
      },
    });
  } catch (error) {
    console.error("Error in getOfficeById:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update office
export const updateOffice = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const {
      name,
      type,
      latitude,
      longitude,
      address,
      contact_info,
      operating_hours,
      parent_office_id,
      assigned_official_id,
    } = req.body;

    // Check if office exists
    const existingOffice = await OfficeModel.findById(officeId);
    if (!existingOffice) {
      return res.status(404).json({
        status: "error",
        message: "Office not found",
      });
    }

    // Handle official assignment changes
    if (assigned_official_id !== undefined) {
      console.log(
        `Processing official assignment for office ${officeId}:`,
        assigned_official_id
      );

      // First, unassign any current official from this office
      const currentOfficials = await UserModel.findByOfficeId(officeId);
      console.log("Current officials for this office:", currentOfficials);

      for (const official of currentOfficials) {
        console.log(
          `Unassigning official ${official.user_id} from office ${officeId}`
        );
        await UserModel.unassignOfficialFromOffice(official.user_id);
      }

      // Then assign the new official if provided
      if (assigned_official_id && assigned_official_id !== "none") {
        console.log(
          `Assigning new official ${assigned_official_id} to office ${officeId}`
        );

        // Validate that the user exists and is an official
        const user = await UserModel.findById(assigned_official_id);
        if (!user) {
          console.log("Assigned user not found:", assigned_official_id);
          return res.status(400).json({
            status: "error",
            message: "Assigned user not found",
          });
        }
        if (user.role !== "official") {
          console.log("User is not an official:", user);
          return res.status(400).json({
            status: "error",
            message: "Only government officials can be assigned to offices",
          });
        }

        // Assign the official to this office
        const assignmentResult = await UserModel.assignOfficialToOffice(
          assigned_official_id,
          officeId
        );
        console.log("Assignment result:", assignmentResult);
      } else {
        console.log("No new official to assign (none selected)");
      }
    } else {
      console.log("No assigned_official_id provided in request");
    }

    // Update office
    const updatedOffice = await OfficeModel.update(officeId, {
      name,
      type,
      latitude,
      longitude,
      address,
      contact_info,
      operating_hours,
      parent_office_id,
    });

    if (!updatedOffice) {
      return res.status(400).json({
        status: "error",
        message: "Failed to update office",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        office: updatedOffice,
      },
    });
  } catch (error) {
    console.error("Error in updateOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete office
export const deleteOffice = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;

    // Check if office exists
    const existingOffice = await OfficeModel.findById(officeId);
    if (!existingOffice) {
      return res.status(404).json({
        status: "error",
        message: "Office not found",
      });
    }

    // Delete office
    const deleted = await OfficeModel.delete(officeId);

    if (!deleted) {
      return res.status(400).json({
        status: "error",
        message: "Failed to delete office",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Office deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
