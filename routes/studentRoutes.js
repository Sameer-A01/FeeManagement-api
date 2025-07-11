import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../utils/multerConfig.js';
import {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  exportStudents
} from '../controllers/studentController.js';

const router = express.Router();

// Create a student with image upload
router.post('/add', authMiddleware, upload.single('profilePic'), addStudent);

// Get all students with filtering, search, pagination
router.get('/', authMiddleware, getStudents);

// Export students to CSV
router.get('/export', authMiddleware, exportStudents);

// Get single student by ID
router.get('/:id', authMiddleware, getStudentById);

// Update student (with optional image upload)
router.put('/:id', authMiddleware, upload.single('profilePic'), updateStudent);

// Delete student
router.delete('/:id', authMiddleware, deleteStudent);

export default router;
