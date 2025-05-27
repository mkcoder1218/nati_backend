import express from 'express';
import { 
  createOffice, 
  getAllOffices, 
  getOfficeById, 
  updateOffice, 
  deleteOffice 
} from '../controllers/office.controller';
import { authenticateJWT, isAdmin, isOfficial } from '../middleware/auth';

const router = express.Router();

// Get all offices (public)
router.get('/', getAllOffices);

// Get office by ID (public)
router.get('/:officeId', getOfficeById);

// Create a new office (admin/official only)
router.post('/', authenticateJWT, isOfficial, createOffice);

// Update office (admin/official only)
router.put('/:officeId', authenticateJWT, isOfficial, updateOffice);

// Delete office (admin only)
router.delete('/:officeId', authenticateJWT, isAdmin, deleteOffice);

export default router;
