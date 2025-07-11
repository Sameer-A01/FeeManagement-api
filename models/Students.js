import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: { 
    type: String,
    sparse: true
  },
  dob: { 
    type: Date,
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other', 'PreferNotToSay'],
    default: 'PreferNotToSay'
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true }
  },
  profilePic: { 
    type: String, 
    default: '',
    validate: {
      validator: function(value) {
        return !value || /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(value);
      },
      message: 'Invalid image URL'
    }
  },

  // Academic fields
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  section: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Section', 
    required: true 
  },
  semester: {
    type: Number,
    min: [1, 'Semester must be at least 1'],
    max: [8, 'Semester cannot exceed 8'],
    required: true
  },
  batch: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch', 
    required: true 
  },
  academicStatus: {
    type: String,
    enum: ['Active', 'OnLeave', 'Graduated', 'Withdrawn'],
    default: 'Active'
  },
  gpa: {
    type: Number,
    min: [0, 'GPA cannot be negative'],
    max: [10, 'GPA cannot exceed 10.0'],
    default: 0
  },

  // Emergency contacts
  emergencyContacts: [{
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true },
    phone: { 
      type: String, 
      required: true,
    },
    email: { 
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    }
  }]
}, {
  timestamps: true,
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);
export default Student;