import mongoose from 'mongoose';

const BatchSchema = new mongoose.Schema({
  startYear: { type: Number, required: true }, // e.g., 2023
  endYear: { type: Number, required: true },   // e.g., 2027
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
});

const Batch = mongoose.model('Batch', BatchSchema);
export default Batch;
