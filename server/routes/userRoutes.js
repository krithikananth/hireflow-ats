const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all HR users in same company (for Employee to pick from)
// @route   GET /api/users/hr
// @access  Auth (Employee)
router.get('/hr', protect, async (req, res) => {
  try {
    const hrUsers = await User.find({
      companyId: req.user.companyId,
      role: 'HR'
    }).select('name email lastActive');

    const now = new Date();
    const data = hrUsers.map(hr => ({
      _id: hr._id,
      name: hr.name,
      email: hr.email,
      isOnline: hr.lastActive && (now - hr.lastActive) < 5 * 60 * 1000, // active in last 5 min
      lastActive: hr.lastActive
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all users (Admin view)
// @route   GET /api/users/admin
// @access  HR only
router.get('/admin', protect, authorize('HR'), async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId })
      .select('name email role companyId lastActive createdAt');

    const now = new Date();
    const data = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      companyId: u.companyId,
      isOnline: u.lastActive && (now - u.lastActive) < 5 * 60 * 1000,
      lastActive: u.lastActive,
      createdAt: u.createdAt
    }));

    const stats = {
      total: data.length,
      online: data.filter(u => u.isOnline).length,
      hrCount: data.filter(u => u.role === 'HR').length,
      employeeCount: data.filter(u => u.role === 'Employee').length,
    };

    res.json({ success: true, stats, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
