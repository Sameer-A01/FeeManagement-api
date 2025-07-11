import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getDashboardAnalytics,
  getFilteredAnalytics,
  addPaymentTransaction,
  applyDiscount,
  applyCustomScholarship,
  getPaymentHistory,
  getCourses,
  getBatches,
  searchStudents,
  exportAnalytics // Add the new controller
} from '../controllers/FeeSummaryController.js';

const router = express.Router();

// Get overall payment analytics
router.get('/dashboard', authMiddleware, getDashboardAnalytics);

// Get filtered payment analytics
router.get('/analytics', authMiddleware, getFilteredAnalytics);
// Export analytics as CSV
router.get('/export', authMiddleware, exportAnalytics); // Add the new route

// Get all courses
router.get('/courses', authMiddleware, getCourses);

// Get all batches
router.get('/batches', authMiddleware, getBatches);

// Search students by name with payment status
router.get('/students/search', authMiddleware, searchStudents);

// Add a payment transaction
router.post('/:feePaymentId/transactions', authMiddleware, addPaymentTransaction);

// Apply a discount
router.post('/:feePaymentId/discount', authMiddleware, applyDiscount);

// Apply a custom scholarship
router.post('/:feePaymentId/scholarship', authMiddleware, applyCustomScholarship);

// Get payment history
router.get('/:feePaymentId/history', authMiddleware, getPaymentHistory);

export default router;