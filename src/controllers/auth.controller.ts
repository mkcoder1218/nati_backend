import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import UserModel from "../models/user.model";

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, phone_number, role } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists",
      });
    }

    // Create new user
    const user = await UserModel.create({
      email,
      password,
      full_name,
      phone_number,
      role: role || "citizen", // Default role is citizen
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret";

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" } as jwt.SignOptions
    );

    // Return user data and token
    return res.status(201).json({
      status: "success",
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          phone_number: user.phone_number,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, phone_number, password } = req.body;

    // Determine if login is with email or phone number
    let user = null;
    if (email) {
      user = await UserModel.findByEmail(email);
    } else if (phone_number) {
      user = await UserModel.findByPhone(phone_number);
    } else {
      return res.status(400).json({
        status: "error",
        message: "Email or phone number is required",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Check if password is correct
    const isPasswordValid = await UserModel.comparePassword(
      password,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Update last login timestamp
    await UserModel.updateLastLogin(user.user_id);

    // Get user with office information (single office assignment)
    const userWithOffice = await UserModel.findWithOfficeInfo(user.user_id);
    const officeName = userWithOffice?.office_name;

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret";

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        office_id: user.office_id,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" } as jwt.SignOptions
    );

    // Return user data and token
    return res.status(200).json({
      status: "success",
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          phone_number: user.phone_number,
          office_id: user.office_id,
          office_name: officeName,
          created_at: user.created_at,
          last_login: user.last_login,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    // Get user data with office information (single office assignment)
    const baseUser = await UserModel.findById(userId);
    if (!baseUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Get office information for all users
    const userWithOffice = await UserModel.findWithOfficeInfo(userId);
    const officeName = userWithOffice?.office_name;

    // Return user data
    return res.status(200).json({
      status: "success",
      data: {
        user: {
          user_id: baseUser.user_id,
          email: baseUser.email,
          full_name: baseUser.full_name,
          role: baseUser.role,
          phone_number: baseUser.phone_number,
          office_id: baseUser.office_id,
          office_name: officeName,
          created_at: baseUser.created_at,
          last_login: baseUser.last_login,
        },
      },
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
