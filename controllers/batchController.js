import Batch from '../models/Batch.js';
import Course from '../models/Course.js';

export const createBatch = async (req, res) => {
  try {
    const { startYear, endYear, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const batch = new Batch({ startYear, endYear, course: courseId });
    await batch.save();

    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBatches = async (req, res) => {
  try {
    const batches = await Batch.find().populate('course');
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
