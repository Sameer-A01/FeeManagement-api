import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2'; // ✅ Import the plugin

const paymentTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true },
  amount: { type: Number, required: true, min: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Cash', 'Other'], 
    required: true 
  },
  paymentDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  receiptUrl: { type: String },
  notes: { type: String },
}, { _id: false });

const feePaymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'FeePlan', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },

  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },

  scholarshipApplied: { type: Number, default: 0, min: 0 },
  customScholarship: {
    type: {
      type: String, // e.g., "Need-Based"
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    }
  },

  lateFeeApplied: { type: Number, default: 0, min: 0 },
  discountApplied: { type: Number, default: 0, min: 0 },

  status: {
    type: String,
    enum: ['OverPayed', 'partially_paid', 'fully_paid', 'overdue', 'waived'],
    default: 'pending',
  },

  dueDate: { type: Date, required: true },

  transactions: [paymentTransactionSchema],

  paymentHistory: [{
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    type: { 
      type: String, 
      enum: ['payment', 'scholarship', 'late_fee', 'discount', 'refund'], 
      required: true 
    },
    description: { type: String },
      recordedBy: { type: String }, // Changed from ObjectId to String
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ Apply pagination plugin
feePaymentSchema.plugin(mongoosePaginate);

feePaymentSchema.pre('save', async function (next) {
  const now = new Date();
  const FeePlan = mongoose.model('FeePlan');
  const feePlan = await FeePlan.findById(this.feePlan);

  let totalScholarship = 0;

  if (feePlan?.scholarships?.length) {
    const match = feePlan.scholarships.find(sch =>
      sch.student.equals(this.student) &&
      now >= new Date(sch.fromDate) &&
      now <= new Date(sch.toDate)
    );
    if (match) {
      this.scholarshipApplied = match.amount;
      totalScholarship += match.amount;

      const alreadyLogged = this.paymentHistory.some(h =>
        h.type === 'scholarship' && h.amount === match.amount && h.description?.includes('FeePlan')
      );
      if (!alreadyLogged) {
        this.paymentHistory.push({
          amount: match.amount,
          type: 'scholarship',
          description: `${match.type} Scholarship from FeePlan`,
          date: now
        });
      }
    }
  }

  if (this.customScholarship?.amount > 0) {
    totalScholarship += this.customScholarship.amount;

    const alreadyLoggedCustom = this.paymentHistory.some(h =>
      h.type === 'scholarship' && h.amount === this.customScholarship.amount &&
      h.description?.includes('Custom')
    );
    if (!alreadyLoggedCustom) {
      this.paymentHistory.push({
        amount: this.customScholarship.amount,
        type: 'scholarship',
        description: `Custom Scholarship${this.customScholarship.type ? ` - ${this.customScholarship.type}` : ''}`,
        date: now
      });
    }
  }

 // Updated late fee logic
  if (now > new Date(this.dueDate) && this.status !== 'fully_paid') {
    if (feePlan?.lateFees?.length) {
      const applicable = feePlan.lateFees.find(fee =>
        new Date(this.dueDate) >= new Date(fee.fromDate) &&
        new Date(this.dueDate) <= new Date(fee.toDate)
      );
      if (applicable) {
        // Only apply if not already applied for this specific late fee
        const alreadyApplied = this.paymentHistory.some(h =>
          h.type === 'late_fee' &&
          h.amount === applicable.fineAmount &&
          h.description?.includes('Late fee applied due to overdue')
        );
        if (!alreadyApplied) {
          this.lateFeeApplied = (this.lateFeeApplied || 0) + applicable.fineAmount;
          this.paymentHistory.push({
            amount: applicable.fineAmount,
            type: 'late_fee',
            description: `Late fee applied due to overdue`,
            date: now
          });
        }
      }
    }
  }
  this.amountPaid = this.transactions.reduce((sum, tx) =>
    tx.status === 'completed' ? sum + tx.amount : sum, 0);

  const totalDue = this.totalAmount - totalScholarship + this.lateFeeApplied - this.discountApplied;

  if (this.amountPaid >= totalDue) {
    this.status = 'fully_paid';
  } else if (this.amountPaid > 0) {
    this.status = 'partially_paid';
  } else if (now > new Date(this.dueDate)) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }

  this.updatedAt = new Date();
  next();
});

const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
export default FeePayment;
