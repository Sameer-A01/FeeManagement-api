import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createFeePlan,
  getFeePlans,
  getFeePlanById,
  updateFeePlan,
  deleteFeePlan
} from '../controllers/feePlanController.js'; // Make sure this is the updated controller

const router = express.Router();

// GET all fee plans (with filters like course, batch, etc.)
router.get('/', authMiddleware, getFeePlans);

// GET a specific fee plan by ID
router.get('/:id', authMiddleware, getFeePlanById);

// POST a new fee plan (with validations and duplicate checks)
router.post('/add', authMiddleware, createFeePlan);

// PUT to update a fee plan
router.put('/:id', authMiddleware, updateFeePlan);

// DELETE a fee plan
router.delete('/:id', authMiddleware, deleteFeePlan);

export default router;
