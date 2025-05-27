import express from 'express';
import { register, login, getProfile } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get current user profile
router.get('/profile', authenticateJWT, getProfile);

export default router;
