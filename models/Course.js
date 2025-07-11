import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., BTech, MBA
  duration: { type: Number, required: true }, // e.g., 4 (years)
});

const Course = mongoose.model('Course', CourseSchema);
export default Course;
