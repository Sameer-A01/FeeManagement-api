import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createBatch,
  getBatches,
  updateBatch,
  deleteBatch
} from '../controllers/batchController.js';

const router = express.Router();

router.get('/', authMiddleware, getBatches);
router.post('/add', authMiddleware, createBatch);
router.put('/:id', authMiddleware, updateBatch);
router.delete('/:id', authMiddleware, deleteBatch);

export default router;
