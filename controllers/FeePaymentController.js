import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for generating unique transaction IDs
import FeePayment from '../models/FeePayment.js';
import FeePlan from '../models/FeePlan.js';
import Student from '../models/Students.js';
// import NotificationService from '../services/NotificationService.js';

export const createFeePayment = async (req, res) => {
  try {
    const { student, feePlan, course, batch, totalAmount, dueDate, transaction, customScholarship } = req.body;

    // Validate required fields
    if (!student || !feePlan) {
      return res.status(400).json({ success: false, message: 'Student and feePlan are required' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(student)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(feePlan)) {
      return res.status(400).json({ success: false, message: 'Invalid feePlan ID format' });
    }
    if (course && !mongoose.Types.ObjectId.isValid(course)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format' });
    }
    if (batch && !mongoose.Types.ObjectId.isValid(batch)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID format' });
    }

    // Check if student exists
    const studentDoc = await Student.findById(student);
    if (!studentDoc) return res.status(404).json({ success: false, message: 'Student not found' });

    // Check if fee plan exists
    const feePlanDoc = await FeePlan.findById(feePlan);
    if (!feePlanDoc) return res.status(404).json({ success: false, message: 'Fee plan not found' });

    // Check for existing payment
    const existingPayment = await FeePayment.findOne({ student, feePlan });
    if (existingPayment) return res.status(409).json({ success: false, message: 'Payment already exists for this student and fee plan' });

    // Validate transaction if provided
    if (transaction) {
      if (!Number.isFinite(transaction.amount) || !transaction.paymentMethod) {
        return res.status(400).json({ success: false, message: 'Invalid transaction data: amount and paymentMethod are required' });
      }
      // If transactionId is not provided, generate a unique one
      transaction.transactionId = transaction.transactionId || uuidv4();
    }

    // Validate customScholarship if provided
    if (customScholarship && !Number.isFinite(customScholarship.amount)) {
      return res.status(400).json({ success: false, message: 'Invalid customScholarship amount' });
    }

    const feePayment = new FeePayment({
      student,
      feePlan,
      course: course || feePlanDoc.course,
      batch: batch || feePlanDoc.batch,
      section: studentDoc.section || feePlanDoc.sections[0],
      totalAmount: totalAmount || feePlanDoc.totalFee,
      dueDate: dueDate || feePlanDoc.dueDate,
      transactions: transaction ? [{ ...transaction, paymentDate: new Date() }] : [],
      customScholarship,
      paymentHistory: transaction ? [{
        amount: transaction.amount,
        type: 'payment',
        description: `Initial payment via ${transaction.paymentMethod}`,
        recordedBy: req.user?.id || 'System',
      }] : [],
    });

    await feePayment.save();
    await Student.findByIdAndUpdate(student, { $push: { feePayments: feePayment._id } });

    res.status(201).json({ success: true, feePayment });
  } catch (error) {
    console.error('Error creating fee payment:', error);
    // Only return 400 for client-side errors; use 500 for server-side errors
    if (error.message === 'NotificationService is not defined') {
      console.warn('NotificationService is not implemented, skipping notification');
      res.status(201).json({ success: true, feePayment: null, warning: 'Notification could not be sent' });
    } else {
      res.status(400).json({ success: false, message: error.message || 'Invalid request data' });
    }
  }
};

export const addPaymentTransaction = async (req, res) => {
  try {
    const { feePaymentId, transaction } = req.body;
    
    // Enhanced validation
    if (!feePaymentId || !transaction) {
      return res.status(400).json({ 
        success: false, 
        message: 'feePaymentId and transaction are required' 
      });
    }

    if (!transaction.amount || !transaction.paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction must include amount and paymentMethod' 
      });
    }

    // Validate amount is a number
    if (isNaN(parseFloat(transaction.amount))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be a valid number' 
      });
    }

    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee payment record not found' 
      });
    }

    // Generate transactionId if not provided
    const transactionId = transaction.transactionId || uuidv4();

    // Check for duplicate transaction ID
    if (feePayment.transactions.some(tx => tx.transactionId === transactionId)) {
      return res.status(409).json({ 
        success: false, 
        message: 'Transaction with this ID already exists' 
      });
    }

    // Add the transaction
    feePayment.transactions.push({ 
      ...transaction, 
      transactionId, 
      paymentDate: new Date(),
      amount: parseFloat(transaction.amount) // Ensure amount is stored as number
    });

    // Add to payment history if completed
    if (transaction.status === 'completed') {
      feePayment.paymentHistory.push({
        amount: parseFloat(transaction.amount),
        type: 'payment',
        description: `Payment via ${transaction.paymentMethod}`,
        recordedBy: req.user?.id || 'system',
      });
    }

    await feePayment.save();

    // Send success response with the updated fee payment
    res.json({ 
      success: true, 
      message: 'Transaction added successfully',
      feePayment 
    });

  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding transaction',
      error: error.message 
    });
  }
};

export const applyScholarshipOrDiscount = async (req, res) => {
  try {
    const { feePaymentId, amount, type, description, recordedBy, customScholarshipType } = req.body;
    
    // Enhanced validation
    if (!feePaymentId || !mongoose.Types.ObjectId.isValid(feePaymentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid feePaymentId is required' 
      });
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid amount is required' 
      });
    }

    if (!type || !['scholarship', 'discount'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type must be either "scholarship" or "discount"' 
      });
    }

    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee payment record not found' 
      });
    }

    // Apply the adjustment
    if (type === 'scholarship') {
      feePayment.customScholarship = {
        type: customScholarshipType || 'Manual',
        amount: parseFloat(amount),
      };
      feePayment.scholarshipApplied = (feePayment.scholarshipApplied || 0) + parseFloat(amount);
    } else {
      feePayment.discountApplied = (feePayment.discountApplied || 0) + parseFloat(amount);
    }

    // Add to payment history
    feePayment.paymentHistory.push({
      amount: parseFloat(amount),
      type,
      description: description || `Manual ${type} applied`,
      recordedBy: recordedBy || req.user?.id || 'system',
      date: new Date()
    });

    await feePayment.save();

    res.json({ 
      success: true, 
      message: `${type} applied successfully`,
      feePayment 
    });
  } catch (error) {
    console.error('Error applying adjustment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while applying adjustment',
      error: error.message 
    });
  }
};

export const getStudentFeePayments = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Validate student ID
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid student ID' 
      });
    }

    // Check if student exists
    const studentExists = await Student.exists({ _id: studentId });
    if (!studentExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    const { page = 1, limit = 10, status, course, batch } = req.query;

    const query = { student: studentId };
    if (status) query.status = status;
    if (course) query.course = course;
    if (batch) query.batch = batch;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: ['student', 'feePlan', 'course', 'batch', 'section'],
    };

    const result = await FeePayment.paginate(query, options);
    
    // Return consistent structure whether paginated or not
    res.json({ 
      success: true, 
      docs: result.docs,
      total: result.total,
      page: result.page,
      pages: result.pages
    });
  } catch (error) {
    console.error('Error fetching student fee payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching fee payments',
      error: error.message 
    });
  }
};

export const getFeePaymentById = async (req, res) => {
  try {
    const feePayment = await FeePayment.findById(req.params.id)
      .populate('student')
      .populate('feePlan')
      .populate('course')
      .populate('batch')
      .populate('section');

    if (!feePayment) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, feePayment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFeePayment = async (req, res) => {
  try {
    const { status, dueDate } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    const feePayment = await FeePayment.findByIdAndUpdate(req.params.id, {
      ...updateData,
      updatedBy: req.user?.id,
    }, { new: true });

    if (!feePayment) return res.status(404).json({ success: false, message: 'Not found' });

    if (status === 'waived') {
      feePayment.paymentHistory.push({
        amount: 0,
        type: 'waived',
        description: 'Waived by admin',
        recordedBy: req.user?.id,
      });
      await feePayment.save();
    }

    res.json({ success: true, feePayment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFeePayment = async (req, res) => {
  try {
    const feePayment = await FeePayment.findByIdAndDelete(req.params.id);
    if (!feePayment) return res.status(404).json({ success: false, message: 'Not found' });
    await Student.findByIdAndUpdate(feePayment.student, { $pull: { feePayments: feePayment._id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkOverduePayments = async () => {
  try {
    const overduePayments = await FeePayment.find({ status: 'overdue' })
      .populate('student', 'name email')
      .populate('feePlan', 'name');

    for (const payment of overduePayments) {
      await NotificationService.send({
        to: payment.student.email,
        subject: `Overdue Fee: ${payment.feePlan.name}`,
        message: `Your fee of ₹${payment.totalAmount} was due on ${payment.dueDate.toDateString()}`,
      });
    }

    console.log('Overdue notifications sent');
  } catch (error) {
    console.error('Overdue check failed:', error.message);
  }
};

export const getFeePaymentAnalytics = async (req, res) => {
  try {
    const totalPayments = await FeePayment.countDocuments();
    const totalAmount = await FeePayment.aggregate([
      { $unwind: '$transactions' },
      { $group: { _id: null, total: { $sum: '$transactions.amount' } } }
    ]);

    res.json({
      success: true,
      analytics: {
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const applyLateFee = async (req, res) => {
  try {
    const { feePaymentId, fineAmount, description } = req.body;

    // Validate required fields
    if (!feePaymentId || !mongoose.Types.ObjectId.isValid(feePaymentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid feePaymentId is required' 
      });
    }

    if (!fineAmount || isNaN(parseFloat(fineAmount))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid fine amount is required' 
      });
    }

    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee payment record not found' 
      });
    }

    // Apply late fee
    feePayment.lateFeeApplied = (feePayment.lateFeeApplied || 0) + parseFloat(fineAmount);
    
    // Add to payment history
    feePayment.paymentHistory.push({
      amount: parseFloat(fineAmount),
      type: 'late_fee',
      description: description || 'Late fee applied',
      recordedBy: req.user?.id || 'system',
      date: new Date()
    });

    await feePayment.save();

    res.json({ 
      success: true, 
      message: 'Late fee applied successfully',
      feePayment 
    });

  } catch (error) {
    console.error('Error applying late fee:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while applying late fee',
      error: error.message 
    });
  }
};