import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  getSectionsByCourse
} from '../controllers/sectionController.js';

const router = express.Router();

router.get('/', authMiddleware, getSections);
router.get('/course/:courseId', authMiddleware, getSectionsByCourse); // Add this route
router.post('/add', authMiddleware, createSection);
router.put('/:id', authMiddleware, updateSection);
router.delete('/:id', authMiddleware, deleteSection);

export default router;
