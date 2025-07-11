import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

import {
  createFeePayment,
  addPaymentTransaction,
  applyScholarshipOrDiscount,
  getStudentFeePayments,
  getFeePaymentById,
  updateFeePayment,
  deleteFeePayment,
  getFeePaymentAnalytics,
  applyLateFee
} from '../controllers/FeePaymentController.js';

const router = express.Router();

// Create a new fee payment
router.post('/add', authMiddleware, createFeePayment);

// Add a transaction to a payment
router.put('/transaction', authMiddleware, addPaymentTransaction);

// Apply scholarship or discount manually
router.put('/apply-discount', authMiddleware, applyScholarshipOrDiscount);
// Add this to your routes file
router.put('/apply-late-fee', authMiddleware, applyLateFee);

// Get fee payments for a student
router.get('/student/:studentId', authMiddleware, getStudentFeePayments);

// Get analytics (supports filtering)
router.get('/', authMiddleware, getFeePaymentAnalytics);

// Get a specific fee payment
router.get('/:id', authMiddleware, getFeePaymentById);

// Update fee payment (status, due date, etc.)
router.put('/:id', authMiddleware, updateFeePayment);

// Delete a fee payment record
router.delete('/:id', authMiddleware, deleteFeePayment);

export default router;
