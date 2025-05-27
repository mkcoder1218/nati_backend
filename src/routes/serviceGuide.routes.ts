import express from 'express';
import { 
  createServiceGuide, 
  getAllServiceGuides, 
  getServiceGuidesByOffice, 
  getServiceGuideById, 
  updateServiceGuide, 
  deleteServiceGuide,
  searchServiceGuides
} from '../controllers/serviceGuide.controller';
import { authenticateJWT, isOfficial } from '../middleware/auth';

const router = express.Router();

// Get all service guides (public)
router.get('/', getAllServiceGuides);

// Search service guides (public)
router.get('/search', searchServiceGuides);

// Get service guides by office (public)
router.get('/office/:officeId', getServiceGuidesByOffice);

// Get service guide by ID (public)
router.get('/:guideId', getServiceGuideById);

// Create a new service guide (admin/official only)
router.post('/', authenticateJWT, isOfficial, createServiceGuide);

// Update service guide (admin/official only)
router.put('/:guideId', authenticateJWT, isOfficial, updateServiceGuide);

// Delete service guide (admin/official only)
router.delete('/:guideId', authenticateJWT, isOfficial, deleteServiceGuide);

export default router;
