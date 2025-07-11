import mongoose from 'mongoose';

const lateFeeSchema = new mongoose.Schema({
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  fineAmount: { type: Number, required: true }
}, { _id: false });

const scholarshipSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, required: true }, // e.g., Merit, Sports, Financial Aid
  amount: { type: Number, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true }
}, { _id: false });

const feeComponentSchema = new mongoose.Schema({
  feeType: {
    type: String,
    enum: ['Tuition', 'Hostel', 'Transport', 'Library', 'Exam', 'Lab', 'Other'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 }
}, { _id: false });

const feePlanSchema = new mongoose.Schema({
  name: { type: String, required: true },

  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },

  duration: {
    type: String,
    enum: ['monthly', 'quarterly', 'semesterly', 'yearly'],
    required: true
  },

  dueDate: { type: Date, required: true },

  feeComponents: [feeComponentSchema],

  totalFee: { type: Number, required: true, min: 0 }, // Editable, but validated

  lateFees: [lateFeeSchema],
  scholarships: [scholarshipSchema],

  additionalNotes: { type: String },

  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional admin/user reference

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

feePlanSchema.pre('save', function (next) {
  // Auto-calculate totalFee if not manually modified
  const calculatedTotal = this.feeComponents.reduce((sum, comp) => {
    const taxAmount = (comp.amount * comp.tax) / 100;
    return sum + comp.amount + taxAmount;
  }, 0);

  if (!this.isModified('totalFee')) {
    this.totalFee = Math.round(calculatedTotal * 100) / 100;
  }

  this.updatedAt = new Date();
  next();
});

const FeePlan = mongoose.model('FeePlan', feePlanSchema);

export default FeePlan;
