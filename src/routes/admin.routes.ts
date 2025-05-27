import express from 'express';
import { 
  getDashboardStats,
  getSystemHealth
} from '../controllers/admin.controller';
import { authenticateJWT, isAdmin } from '../middleware/auth';

const router = express.Router();

// Get admin dashboard statistics (admin only)
router.get('/dashboard/stats', authenticateJWT, isAdmin, getDashboardStats);

// Get system health status (admin only)
router.get('/system/health', authenticateJWT, isAdmin, getSystemHealth);

export default router;
