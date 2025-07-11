import FeePlan from '../models/FeePlan.js';
import Student from '../models/Students.js';

// Helper: Calculate total fee from components
const calculateTotalFee = (components = []) => {
  return components.reduce(
    (acc, comp) => acc + (Number(comp.amount) || 0) + (Number(comp.tax) || 0),
    0
  );
};

// Create a new fee plan
export const createFeePlan = async (req, res) => {
  try {
    const data = req.body;

    // 1. Prevent duplicate fee plan creation
    const existingPlan = await FeePlan.findOne({
      course: data.course,
      batch: data.batch,
      duration: data.duration,
      sections: { $in: data.sections || [] }
    });

    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: 'A fee plan already exists for this course, batch, duration, and section.'
      });
    }

    // 2. Auto-calculate total fee if not set
    if (!data.totalFee && data.feeComponents?.length) {
      data.totalFee = calculateTotalFee(data.feeComponents);
    }

    // 3. Optional: Validate date ranges (lateFees and scholarships)
    data.lateFees?.forEach((fee, i) => {
      if (new Date(fee.startDate) > new Date(fee.endDate)) {
        throw new Error(`Late fee at index ${i} has invalid date range`);
      }
    });

    data.scholarships?.forEach((sch, i) => {
      if (new Date(sch.startDate) > new Date(sch.endDate)) {
        throw new Error(`Scholarship at index ${i} has invalid date range`);
      }
    });

    // 4. Optional: Validate students in scholarships
    for (const sch of data.scholarships || []) {
      const student = await Student.findById(sch.student);
      if (!student) {
        throw new Error(`Invalid student ID in scholarship: ${sch.student}`);
      }
    }

    // 5. Save fee plan
    const feePlan = new FeePlan(data);
    await feePlan.save();

    res.status(201).json({ success: true, message: 'Fee plan created successfully', feePlan });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all fee plans with filters
export const getFeePlans = async (req, res) => {
  try {
    const { course, batch, section, category, duration, status } = req.query;

    const query = {};

    if (course) query.course = course;
    if (batch) query.batch = batch;
    if (section) query.sections = section;
    if (category) query.applicableTo = category;
    if (duration) query.duration = duration;
    if (status) query.status = status;

    const plans = await FeePlan.find(query)
      .populate('course', 'name')
      .populate('sections', 'name')
      .populate('batch', 'startYear endYear')
      .populate('scholarships.student', 'name email');

    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a fee plan by ID
export const getFeePlanById = async (req, res) => {
  try {
    const plan = await FeePlan.findById(req.params.id)
      .populate('course', 'name')
      .populate('sections', 'name')
      .populate('batch', 'startYear endYear')
      .populate('scholarships.student', 'name email');

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Fee plan not found' });
    }

    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a fee plan
export const updateFeePlan = async (req, res) => {
  try {
    const data = req.body;

    // Auto-calculate total fee if not set
    if (!data.totalFee && data.feeComponents?.length) {
      data.totalFee = calculateTotalFee(data.feeComponents);
    }

    const updatedPlan = await FeePlan.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ success: false, message: 'Fee plan not found' });
    }

    res.json({ success: true, message: 'Fee plan updated successfully', plan: updatedPlan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a fee plan
export const deleteFeePlan = async (req, res) => {
  try {
    const deleted = await FeePlan.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Fee plan not found' });
    }

    res.json({ success: true, message: 'Fee plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
