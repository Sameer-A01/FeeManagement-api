import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createCourse,
  getCourses,
  updateCourse,
  deleteCourse
} from '../controllers/courseController.js';

const router = express.Router();

// Get all courses
router.get('/', authMiddleware, getCourses);

// Add a course
router.post('/add', authMiddleware, createCourse);

// Update a course
router.put('/:id', authMiddleware, updateCourse);

// Delete a course
router.delete('/:id', authMiddleware, deleteCourse);

export default router;
