import { Request, Response } from "express";
import UserModel from "../models/user.model";
import { AuthenticatedRequest } from "../middleware/auth";

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await UserModel.getAll(limit, offset);

    // Remove password from response
    const sanitizedUsers = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return res.status(200).json({
      status: "success",
      data: {
        users: sanitizedUsers,
        count: sanitizedUsers.length,
      },
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Helper function to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID format",
      });
    }

    // Get user with office information
    const user = await UserModel.findWithOfficeInfo(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      status: "success",
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { full_name, phone_number, password } = req.body;

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID format",
      });
    }

    // Check if user exists
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Update user
    const updatedUser = await UserModel.update(userId, {
      full_name,
      phone_number,
      password,
    });

    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        message: "Failed to update user",
      });
    }

    // Remove password from response
    const { password: userPassword, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      status: "success",
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID format",
      });
    }

    // Check if role is valid
    if (!["citizen", "official", "admin"].includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role",
      });
    }

    // Check if user exists
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Update user role
    const updatedUser = await UserModel.update(userId, { role });

    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        message: "Failed to update user role",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      status: "success",
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get available government officials (admin only)
export const getAvailableOfficials = async (req: Request, res: Response) => {
  try {
    const officials = await UserModel.getAvailableOfficials();

    // Remove password from response
    const sanitizedOfficials = officials.map((official) => {
      const { password, ...officialWithoutPassword } = official;
      return officialWithoutPassword;
    });

    return res.status(200).json({
      status: "success",
      data: {
        officials: sanitizedOfficials,
        count: sanitizedOfficials.length,
      },
    });
  } catch (error) {
    console.error("Error in getAvailableOfficials:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID format",
      });
    }

    // Check if user exists
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Delete user
    const deleted = await UserModel.delete(userId);

    if (!deleted) {
      return res.status(400).json({
        status: "error",
        message: "Failed to delete user",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Assign user to office (single office assignment)
export const assignUserToOffice = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { office_id } = req.body;

    // Validate UUID formats
    if (!isValidUUID(userId) || !isValidUUID(office_id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format",
      });
    }

    // Check if user exists and is an official
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (user.role !== "official") {
      return res.status(400).json({
        status: "error",
        message: "Only government officials can be assigned to offices",
      });
    }

    // Assign user to office using the simple method
    const updatedUser = await UserModel.assignOfficialToOffice(
      userId,
      office_id
    );

    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        message: "Failed to assign user to office",
      });
    }

    // Get user with office information to include office name
    const userWithOfficeInfo = await UserModel.findWithOfficeInfo(userId);

    return res.status(200).json({
      status: "success",
      message: "User assigned to office successfully",
      data: {
        user: {
          user_id: updatedUser.user_id,
          email: updatedUser.email,
          role: updatedUser.role,
          full_name: updatedUser.full_name,
          phone_number: updatedUser.phone_number,
          office_id: updatedUser.office_id,
          office_name: userWithOfficeInfo?.office_name,
        },
      },
    });
  } catch (error) {
    console.error("Error in assignUserToOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Remove user from office (unassign)
export const removeUserFromOffice = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID format",
      });
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (user.role !== "official") {
      return res.status(400).json({
        status: "error",
        message: "Only government officials can be unassigned from offices",
      });
    }

    // Remove user from office
    const updatedUser = await UserModel.unassignOfficialFromOffice(userId);

    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        message: "Failed to remove user from office",
      });
    }

    // Get user with office information (should be null after removal)
    const userWithOfficeInfo = await UserModel.findWithOfficeInfo(userId);

    return res.status(200).json({
      status: "success",
      message: "User removed from office successfully",
      data: {
        user: {
          user_id: updatedUser.user_id,
          email: updatedUser.email,
          role: updatedUser.role,
          full_name: updatedUser.full_name,
          phone_number: updatedUser.phone_number,
          office_id: updatedUser.office_id,
          office_name: userWithOfficeInfo?.office_name,
        },
      },
    });
  } catch (error) {
    console.error("Error in removeUserFromOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
