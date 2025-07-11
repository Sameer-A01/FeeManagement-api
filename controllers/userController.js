import User from '../models/User.js';
import bcrypt from 'bcrypt';

// Route to add a new employee
const addUser = async (req, res) => {
  try {
    const {
      name, email, password, role, address
    } = req.body;

    // Check if user already exists with the same email
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "User already exists" });
    }

    // Hash the password before storing the user
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
        name, email, password: hashedPassword, address, role
    });
    const user = await newUser.save();

    return res.status(201).json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(201).json({success:true, users });
  } catch (error) {
    res.status(500).json({ success:false, error: 'Server error '+error.message });
  }
}

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const user = await User.findById(req.user._id).select('-password'); // Exclude password
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(201).json({success:true, user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success:false, error: 'Server error '+err.message });
  }
}

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    // If password is included, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: updateData.name, email: updateData.email, password: updateData.password, address: updateData.address },
      { new: true, runValidators: true }
    ).select('-password'); // Don't return password in response

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}


const deleteUser = async (req, res) => {
  try {
    const {id} = req.params;
  
    const user = await User.findByIdAndDelete({_id: id})
    if(!user) {
      res.status(404).json({ success:false, error: 'document not found '+error.message });
    }
    res.status(201).json({success:true, user });
  } catch (error) {
    console.error('Error editing User:', error);
    res.status(500).json({ success:false, error: 'Server error '+error.message });
  }
}


export {addUser, getUsers, deleteUser, getUser, updateUser};
