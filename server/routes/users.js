import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all users (manager and above)
router.get('/', 
  authenticate, 
  authorize('maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager'), 
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query;
      
      const filter = {};
      
      if (search) {
        filter.$or = [
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role && role !== 'all') {
        filter['permissions.role'] = role;
      }
      
      if (status && status !== 'all') {
        filter.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      res.json({
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Server error fetching users' });
    }
  }
);

// Create new user (manager and above)
router.post('/', 
  authenticate, 
  authorize('maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager'), 
  async (req, res) => {
    try {
      // Validate required fields
      const { email, password, profile, permissions } = req.body;
      
      if (!email || !password || !profile || !permissions) {
        return res.status(400).json({ 
          message: 'Email, password, profile, and permissions are required' 
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Check if employeeId already exists
      if (req.body.employeeId) {
        const existingEmployee = await User.findOne({ employeeId: req.body.employeeId });
        if (existingEmployee) {
          return res.status(400).json({ message: 'Employee ID already exists' });
        }
      }

      const user = new User(req.body);
      await user.save();

      res.status(201).json({
        message: 'User created successfully',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Create user error:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({ message: 'Validation error', errors });
      }
      res.status(500).json({ message: 'Server error creating user' });
    }
  }
);

// Get single user
router.get('/:id', 
  authenticate, 
  authorize('maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager'), 
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Server error fetching user' });
    }
  }
);

// Update user (manager and above)
router.put('/:id', 
  authenticate, 
  authorize('maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager'), 
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Don't allow password updates through this endpoint
      delete req.body.password;

      // Check if email is being changed and if it already exists
      if (req.body.email && req.body.email !== user.email) {
        const existingUser = await User.findOne({ 
          email: req.body.email.toLowerCase(),
          _id: { $ne: req.params.id }
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      // Check if employeeId is being changed and if it already exists
      if (req.body.employeeId && req.body.employeeId !== user.employeeId) {
        const existingEmployee = await User.findOne({ 
          employeeId: req.body.employeeId,
          _id: { $ne: req.params.id }
        });
        if (existingEmployee) {
          return res.status(400).json({ message: 'Employee ID already exists' });
        }
      }

      Object.assign(user, req.body);
      await user.save();

      res.json({
        message: 'User updated successfully',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Update user error:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({ message: 'Validation error', errors });
      }
      res.status(500).json({ message: 'Server error updating user' });
    }
  }
);

// Delete user (manager and above)
router.delete('/:id', 
  authenticate, 
  authorize('maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager'), 
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Don't allow deleting yourself
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({ message: 'User deleted successfully' });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Server error deleting user' });
    }
  }
);

// Change user password (manager and above)
router.put('/:id/password', 
  authenticate, 
  authorize('maintenance_manager', 'operations_superintendent', 'financial_manager', 'general_manager'), 
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });

    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ message: 'Server error updating password' });
    }
  }
);

export default router;