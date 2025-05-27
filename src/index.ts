import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import path from "path";

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import officeRoutes from "./routes/office.routes";
import reviewRoutes from "./routes/review.routes";
import serviceGuideRoutes from "./routes/serviceGuide.routes";
import sentimentRoutes from "./routes/sentiment.routes";
import voteRoutes from "./routes/vote.routes";
import officeVoteRoutes from "./routes/officeVote.routes";
import governmentRoutes from "./routes/government.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes from "./routes/notification.routes";
import commentRoutes from "./routes/comment.routes";
import commentReplyRoutes from "./routes/commentReply.routes";
import reportsRoutes from "./routes/reports.routes";
import reviewReplyRoutes from "./routes/reviewReply.routes";
import scheduledReportRoutes from "./routes/scheduledReport.routes";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { authenticateJWT } from "./middleware/auth";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5002; // Changed from 5000 to avoid conflicts

// Middleware
// Configure CORS to allow requests from frontend
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://localhost:3000",
      "https://localhost:3001",
      process.env.FRONTEND_URL,
      // Add common deployment URLs
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.onrender\.com$/,
      // Allow any localhost with any port for development
      /^http:\/\/localhost:\d+$/,
      /^https:\/\/localhost:\d+$/,
    ].filter(Boolean); // Remove undefined values

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === "string") {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      console.log(`Allowed origins:`, allowedOrigins);
      callback(null, true); // Allow all origins for now to fix CORS issues
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};
app.use(cors(corsOptions));

// Additional CORS headers for preflight requests
app.use((req: any, res: any, next: any) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsers - MUST come before logging middleware to parse req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Request headers:", req.headers);
  if (req.method !== "GET") {
    console.log("Request body:", req.body);
  }
  next();
});

// Initialize Passport
app.use(passport.initialize());

// Configure passport
import "./config/passport";

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/service-guides", serviceGuideRoutes);
app.use("/api/sentiment", sentimentRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/office-votes", officeVoteRoutes);
app.use("/api/government", governmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/comments", commentReplyRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/review-replies", reviewReplyRoutes);
app.use("/api/scheduled-reports", scheduledReportRoutes);

// Serve static files from the public directory
app.use("/public", express.static(path.join(__dirname, "../public")));

// Root route
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Government Service Feedback System API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    cors: "enabled",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    cors: "enabled",
    headers: req.headers,
  });
});

// Test route for debugging
app.get("/api/test", (req, res) => {
  res.json({
    status: "success",
    message: "API test endpoint is working",
    timestamp: new Date().toISOString(),
    headers: req.headers,
  });
});

// Test route for debugging auth
app.post("/api/test/auth", (req, res) => {
  res.json({
    status: "success",
    message: "Auth test endpoint is working",
    timestamp: new Date().toISOString(),
    receivedData: req.body,
  });
});

// Test route for debugging auth with JWT
app.get("/api/test/auth-jwt", authenticateJWT, (req, res) => {
  res.json({
    status: "success",
    message: "Auth JWT test endpoint is working",
    timestamp: new Date().toISOString(),
    user: (req as any).user,
  });
});

// Test route for debugging office votes
app.post("/api/test/office-vote/:officeId", authenticateJWT, (req, res) => {
  const { officeId } = req.params;
  const { vote_type } = req.body;
  const userId = (req as any).user.user_id;

  res.json({
    status: "success",
    message: "Office vote test endpoint is working",
    timestamp: new Date().toISOString(),
    officeId,
    vote_type,
    userId,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
