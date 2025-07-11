import Student from '../models/Students.js';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Batch from '../models/Batch.js';
import { Parser } from 'json2csv';

// Add new student with optional profilePic upload
const addStudent = async (req, res) => {
  try {
    const studentData = req.body;

    // If a file is uploaded, store the file path
    if (req.file) {
      studentData.profilePic = `/uploads/${req.file.filename}`;
    }

    const student = new Student(studentData);
    await student.save();

    res.status(201).json({ success: true, message: "Student added successfully", student });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all students with pagination, filters, search
const getStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      course,
      section,
      batch,
      academicStatus,
      minGpa,
      maxGpa
    } = req.query;

    const query = {
      $and: [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      ]
    };

    if (course) query.$and.push({ course });
    if (section) query.$and.push({ section });
    if (batch) query.$and.push({ batch });
    if (academicStatus) query.$and.push({ academicStatus });
    if (minGpa || maxGpa) {
      query.$and.push({
        gpa: {
          ...(minGpa && { $gte: Number(minGpa) }),
          ...(maxGpa && { $lte: Number(maxGpa) })
        }
      });
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('course', 'name')
      .populate('section', 'name')
      .populate('batch', 'startYear endYear')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: students,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export students as CSV
const exportStudentsCSV = async (req, res) => {
  try {
    const students = await Student.find({})
      .populate('course', 'name')
      .populate('section', 'name')
      .populate('batch', 'startYear endYear')
      .lean();

    const formatted = students.map(student => ({
      Name: student.name,
      Email: student.email,
      Phone: student.phone,
      Gender: student.gender,
      DOB: student.dob?.toISOString().split('T')[0],
      GPA: student.gpa,
      AcademicStatus: student.academicStatus,
      Course: student.course?.name,
      Section: student.section?.name,
      Batch: `${student.batch?.startYear}-${student.batch?.endYear}`
    }));

    const parser = new Parser();
    const csv = parser.parse(formatted);

    res.header('Content-Type', 'text/csv');
    res.attachment('students.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: 'CSV Export Failed: ' + error.message });
  }
};

// Update student with optional profilePic upload
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (req.file) {
      updatedData.profilePic = `/uploads/${req.file.filename}`;
    }

    const updated = await Student.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    res.json({ success: true, message: "Student updated", student: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ success: false, error: "Student not found" });

    res.json({ success: true, message: "Student deleted", student: deleted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single student by ID
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('course', 'name')
      .populate('section', 'name')
      .populate('batch', 'startYear endYear');

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export {
  addStudent,
  getStudents,
  updateStudent,
  getStudentById,
  deleteStudent,
  exportStudentsCSV as exportStudents
};