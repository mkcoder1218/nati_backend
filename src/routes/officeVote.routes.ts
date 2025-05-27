import express from 'express';
import { 
  voteOnOffice, 
  removeVote, 
  getVotesByOffice, 
  getUserVoteStats,
  getTopVotedOffices,
  getVoteTrends
} from '../controllers/officeVote.controller';
import { authenticateJWT, isAdmin, isOfficial } from '../middleware/auth';

const router = express.Router();

// Vote on an office (authenticated users only)
router.post('/office/:officeId', authenticateJWT, voteOnOffice);

// Remove vote from an office (authenticated users only)
router.delete('/office/:officeId', authenticateJWT, removeVote);

// Get votes for an office (public, but includes user's vote if authenticated)
router.get('/office/:officeId', getVotesByOffice);

// Get user's vote statistics (authenticated users only)
router.get('/user/stats', authenticateJWT, getUserVoteStats);

// Get top voted offices (public)
router.get('/top', getTopVotedOffices);

// Get vote trends (admin/official only)
router.get('/trends', authenticateJWT, isOfficial, getVoteTrends);

export default router;
