import FeePayment from '../models/FeePayment.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Student from '../models/Students.js';
import mongoose from 'mongoose';
import { Parser } from 'json2csv';

// Helper function to aggregate payment data
const getPaymentAnalytics = async (query = {}) => {
  const matchStage = { $match: query };
  
  const analytics = await FeePayment.aggregate([
    matchStage,
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $unwind: {
        path: '$studentInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'studentInfo.course',
        foreignField: '_id',
        as: 'courseInfo'
      }
    },
    {
      $unwind: {
        path: '$courseInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'studentInfo.batch',
        foreignField: '_id',
        as: 'batchInfo'
      }
    },
    {
      $unwind: {
        path: '$batchInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'sections',
        localField: 'studentInfo.section',
        foreignField: '_id',
        as: 'sectionInfo'
      }
    },
    {
      $unwind: {
        path: '$sectionInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $facet: {
        totalFees: [
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ],
        totalPaid: [
          { $group: { _id: null, total: { $sum: "$amountPaid" } } }
        ],
        totalFines: [
          { $group: { _id: null, total: { $sum: "$lateFeeApplied" }, count: { $sum: 1 } } }
        ],
        totalScholarships: [
          { $group: { _id: null, total: { $sum: { $add: ["$scholarshipApplied", "$customScholarship.amount"] } } } }
        ],
        totalDiscounts: [
          { $group: { _id: null, total: { $sum: "$discountApplied" } } }
        ],
        paymentMethods: [
          { $unwind: "$transactions" },
          { $match: { "transactions.status": "completed" } },
          { $group: { _id: "$transactions.paymentMethod", total: { $sum: "$transactions.amount" }, count: { $sum: 1 } } }
        ],
        statusBreakdown: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        studentsByStatus: [
          {
            $group: {
              _id: "$status",
              students: {
                $push: {
                  name: "$studentInfo.name",
                  studentId: "$studentInfo._id",
                  course: "$courseInfo.name",
                  batch: { $concat: [{ $toString: "$batchInfo.startYear" }, "-", { $toString: "$batchInfo.endYear" }] },
                  semester: "$studentInfo.semester",
                  section: "$sectionInfo.name"
                }
              }
            }
          }
        ]
      }
    }
  ]);

  return {
    totalFees: analytics[0].totalFees[0]?.total || 0,
    totalPaid: analytics[0].totalPaid[0]?.total || 0,
    totalFines: analytics[0].totalFines[0]?.total || 0,
    fineCount: analytics[0].totalFines[0]?.count || 0,
    totalScholarships: analytics[0].totalScholarships[0]?.total || 0,
    totalDiscounts: analytics[0].totalDiscounts[0]?.total || 0,
    paymentMethods: analytics[0].paymentMethods,
    statusBreakdown: analytics[0].statusBreakdown,
    studentsByStatus: analytics[0].studentsByStatus
  };
};

// Controller functions
export const getDashboardAnalytics = async (req, res) => {
  try {
    const analytics = await getPaymentAnalytics();
    res.status(200).json({
      success: true,
      data: {
        totalFees: analytics.totalFees,
        totalCollected: analytics.totalPaid,
        totalOutstanding: analytics.totalFees - analytics.totalPaid,
        totalFines: analytics.totalFines,
        numberOfFines: analytics.fineCount,
        totalScholarships: analytics.totalScholarships,
        totalDiscounts: analytics.totalDiscounts,
        paymentMethodBreakdown: analytics.paymentMethods,
        statusDistribution: analytics.statusBreakdown,
        studentsByStatus: analytics.studentsByStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFilteredAnalytics = async (req, res) => {
  try {
    const { courseName, batchStartYear, batchEndYear, section, startDate, endDate, status } = req.query;
    const query = {};

    // Lookup Course by name
    if (courseName) {
      const course = await Course.findOne({ name: courseName });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      query.course = course._id;
    }

    // Lookup Batch by startYear and endYear
    if (batchStartYear && batchEndYear) {
      const batch = await Batch.findOne({ startYear: Number(batchStartYear), endYear: Number(batchEndYear) });
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }
      query.batch = batch._id;
    }

    if (section) query.section = new mongoose.Types.ObjectId(section);
    if (status) query.status = status;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const analytics = await getPaymentAnalytics(query);
    res.status(200).json({
      success: true,
      data: {
        totalFees: analytics.totalFees,
        totalCollected: analytics.totalPaid,
        totalOutstanding: analytics.totalFees - analytics.totalPaid,
        totalFines: analytics.totalFines,
        numberOfFines: analytics.fineCount,
        totalScholarships: analytics.totalScholarships,
        totalDiscounts: analytics.totalDiscounts,
        paymentMethodBreakdown: analytics.paymentMethods,
        statusDistribution: analytics.statusBreakdown,
        studentsByStatus: analytics.studentsByStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addPaymentTransaction = async (req, res) => {
  try {
    const { feePaymentId, amount, paymentMethod, notes } = req.body;
    
    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found' });
    }

    const transaction = {
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount,
      paymentMethod,
      status: 'completed',
      notes,
      paymentDate: new Date()
    };

    feePayment.transactions.push(transaction);
    feePayment.paymentHistory.push({
      amount,
      type: 'payment',
      description: `Payment via ${paymentMethod}${notes ? `: ${notes}` : ''}`,
      recordedBy: req.user?.name || 'System'
    });

    await feePayment.save();
    
    res.status(200).json({
      success: true,
      data: feePayment,
      message: 'Payment transaction added successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const applyDiscount = async (req, res) => {
  try {
    const { feePaymentId, amount, description } = req.body;
    
    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found' });
    }

    feePayment.discountApplied += amount;
    feePayment.paymentHistory.push({
      amount,
      type: 'discount',
      description: description || 'Discount applied',
      recordedBy: req.user?.name || 'System'
    });

    await feePayment.save();
    
    res.status(200).json({
      success: true,
      data: feePayment,
      message: 'Discount applied successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const applyCustomScholarship = async (req, res) => {
  try {
    const { feePaymentId, amount, type, description } = req.body;
    
    const feePayment = await FeePayment.findById(feePaymentId);
    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found' });
    }

    feePayment.customScholarship = { amount, type };
    feePayment.paymentHistory.push({
      amount,
      type: 'scholarship',
      description: description || `Custom ${type} Scholarship`,
      recordedBy: req.user?.name || 'System'
    });

    await feePayment.save();
    
    res.status(200).json({
      success: true,
      data: feePayment,
      message: 'Custom scholarship applied successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { feePaymentId } = req.params;
    const feePayment = await FeePayment.findById(feePaymentId)
      .select('paymentHistory transactions')
      .lean();

    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentHistory: feePayment.paymentHistory,
        transactions: feePayment.transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch courses and batches
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().select('name');
    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBatches = async (req, res) => {
  try {
    const batches = await Batch.find().select('startYear endYear');
    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search students by name with payment status
export const searchStudents = async (req, res) => {
  try {
    const { name } = req.query;
    const query = name ? { name: { $regex: name, $options: 'i' } } : {};

    const students = await Student.find(query)
      .select('name _id')
      .lean();

    const studentIds = students.map(student => student._id);
    const feePayments = await FeePayment.find({ student: { $in: studentIds } })
      .select('student status')
      .lean();

    const results = students.map(student => {
      const payment = feePayments.find(p => p.student.toString() === student._id.toString());
      return {
        studentId: student._id,
        name: student.name,
        status: payment ? payment.status : 'No payment record'
      };
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Export analytics as CSV
export const exportAnalytics = async (req, res) => {
  try {
    const { courseName, batchStartYear, batchEndYear, section, startDate, endDate, status } = req.query;
    const query = {};

    // Build query for filtered export (same logic as getFilteredAnalytics)
    if (courseName) {
      const course = await Course.findOne({ name: courseName });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      query.course = course._id;
    }

    if (batchStartYear && batchEndYear) {
      const batch = await Batch.findOne({ startYear: Number(batchStartYear), endYear: Number(batchEndYear) });
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }
      query.batch = batch._id;
    }

    if (section) query.section = new mongoose.Types.ObjectId(section);
    if (status) query.status = status;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const analytics = await getPaymentAnalytics(query);

    // Prepare data for CSV
    const csvData = [];

    // Add summary data
    csvData.push({
      Type: 'Summary',
      TotalFees: analytics.totalFees,
      TotalCollected: analytics.totalPaid,
      TotalOutstanding: analytics.totalFees - analytics.totalPaid,
      TotalFines: analytics.totalFines,
      NumberOfFines: analytics.fineCount,
      TotalScholarships: analytics.totalScholarships,
      TotalDiscounts: analytics.totalDiscounts,
    });

    // Add payment method breakdown
    analytics.paymentMethods.forEach((method) => {
      csvData.push({
        Type: 'Payment Method',
        PaymentMethod: method._id,
        Total: method.total,
        Transactions: method.count,
      });
    });

    // Add status breakdown
    analytics.statusBreakdown.forEach((status) => {
      csvData.push({
        Type: 'Status Breakdown',
        Status: status._id,
        Count: status.count,
      });
    });

    // Add students by status
    analytics.studentsByStatus.forEach((statusGroup) => {
      statusGroup.students.forEach((student) => {
        csvData.push({
          Type: 'Student',
          Status: statusGroup._id,
          StudentName: student.name,
          StudentId: student.studentId,
          Course: student.course || 'N/A',
          Batch: student.batch || 'N/A',
          Semester: student.semester || 'N/A',
          Section: student.section || 'N/A',
        });
      });
    });

    // Define CSV fields
    const fields = [
      'Type',
      'TotalFees',
      'TotalCollected',
      'TotalOutstanding',
      'TotalFines',
      'NumberOfFines',
      'TotalScholarships',
      'TotalDiscounts',
      'PaymentMethod',
      'Total',
      'Transactions',
      'Status',
      'Count',
      'StudentName',
      'StudentId',
      'Course',
      'Batch',
      'Semester',
      'Section',
    ];

    // Convert to CSV
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    // Set response headers for CSV download
    res.setHeader('Content-Disposition', `attachment; filename=fee-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};