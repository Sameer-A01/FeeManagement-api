import Section from '../models/Section.js';
import Course from '../models/Course.js';
import mongoose from 'mongoose';

export const createSection = async (req, res) => {
  try {
    const { name, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const section = new Section({ name, course: courseId });
    await section.save();

    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSections = async (req, res) => {
  try {
    const sections = await Section.find().populate('course');
    res.json(sections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json({ message: "Section deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSectionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Fetch sections for the course
    const sections = await Section.find({ course: courseId }).select('name _id');

    res.status(200).json({ success: true, sections });
  } catch (err) {
    console.error('Error fetching sections:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};