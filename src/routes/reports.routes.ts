import express from "express";
import path from "path";
import fs from "fs-extra";
import jwt from "jsonwebtoken";
import { authenticateJWT, isOfficial } from "../middleware/auth";
import {
  getReports,
  getReportById,
  deleteReport,
  updateReportStatus,
} from "../controllers/report.controller";

const router = express.Router();

// Report management routes
router.get("/", authenticateJWT, isOfficial, getReports);
router.get("/metadata/:reportId", authenticateJWT, isOfficial, getReportById);
router.delete("/:reportId", authenticateJWT, isOfficial, deleteReport);
router.patch(
  "/:reportId/status",
  authenticateJWT,
  isOfficial,
  updateReportStatus
);

// Test route to check if reports directory is accessible
router.get("/test", (req, res) => {
  try {
    const reportsDir = path.join(__dirname, "../../public/reports");
    console.log("Reports directory path:", reportsDir);

    // Check if directory exists
    const dirExists = fs.existsSync(reportsDir);
    console.log("Reports directory exists:", dirExists);

    // Create directory if it doesn't exist
    if (!dirExists) {
      fs.ensureDirSync(reportsDir);
      console.log("Created reports directory");
    }

    // List files in directory
    const files = fs.readdirSync(reportsDir);
    console.log("Files in reports directory:", files);

    // Create a test file
    const testFilePath = path.join(reportsDir, "test-file.txt");
    fs.writeFileSync(testFilePath, "This is a test file");
    console.log("Created test file:", testFilePath);

    return res.status(200).json({
      status: "success",
      message: "Reports directory is accessible",
      directory: reportsDir,
      files: files,
      testFile: testFilePath,
    });
  } catch (error) {
    console.error("Error testing reports directory:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      status: "error",
      message: "Error testing reports directory",
      details: errorMessage,
    });
  }
});

// Define the reports directory
const REPORTS_DIR = path.join(__dirname, "../../public/reports");

// Custom middleware to handle both JWT and token query param
const authenticateForReports = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Check if token is provided in query params
  const tokenFromQuery = req.query.token as string;

  if (tokenFromQuery) {
    console.log("Token provided in query params");
    try {
      // Verify the token from query params
      const decoded = jwt.verify(
        tokenFromQuery,
        process.env.JWT_SECRET as string
      );
      (req as any).user = decoded;
      return next();
    } catch (error) {
      console.error("Invalid token in query params:", error);
      // Continue to try the regular JWT auth
    }
  }

  // If no token in query params or it's invalid, try regular JWT auth
  return authenticateJWT(req, res, next);
};

// Serve report files (requires authentication)
router.get("/:filename", authenticateForReports, (req, res) => {
  try {
    console.log("Report download request received:", req.params);
    console.log("User requesting report:", req.user);
    console.log("Request headers:", req.headers);
    console.log("Query params:", req.query);

    const { filename } = req.params;

    // Validate filename to prevent directory traversal attacks
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      console.error("Invalid filename requested:", filename);
      return res.status(400).json({
        status: "error",
        message: "Invalid filename",
      });
    }

    // Construct the file path
    const filePath = path.join(REPORTS_DIR, filename);
    console.log("Looking for report file at:", filePath);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error("Report file not found:", filePath);
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }

    // Check file size
    const stats = fs.statSync(filePath);
    console.log("Report file found, size:", stats.size, "bytes");

    if (stats.size === 0) {
      console.error("Report file is empty:", filePath);
      return res.status(500).json({
        status: "error",
        message: "Report file is empty",
      });
    }

    // Determine the content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream"; // Default

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".xlsx":
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case ".csv":
        contentType = "text/csv";
        break;
    }

    console.log("Serving file with content type:", contentType);

    // Set headers for file download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Read the file into memory to avoid streaming issues
    try {
      console.log("Reading file into memory:", filePath);
      const fileData = fs.readFileSync(filePath);
      console.log("File read successfully, size:", fileData.length, "bytes");

      // Send the file data directly
      res.send(fileData);

      console.log("Report file served successfully:", filename);
    } catch (readError) {
      console.error("Error reading file:", readError);
      return res.status(500).json({
        status: "error",
        message: "Error reading file",
        details:
          readError instanceof Error ? readError.message : String(readError),
      });
    }
  } catch (error) {
    console.error("Error serving report file:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: errorMessage,
    });
  }
});

export default router;
