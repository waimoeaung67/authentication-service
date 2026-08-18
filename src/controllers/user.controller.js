const bcrypt = require('bcryptjs');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role address balance');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, address: user.address, balance: user.balance });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, address } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (address) updates.address = address.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('name email role address balance');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, address: user.address, balance: user.balance, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.validateToken = (req, res) => {
  res.json({ valid: true, userId: req.user.id, role: req.user.role });
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role address balance');
    res.json(users.map((user) => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, address: user.address, balance: user.balance })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role address balance');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, address: user.address, balance: user.balance });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['USER', 'ADMIN'];
    if (!role || !allowedRoles.includes(role.toUpperCase())) return res.status(400).json({ error: 'Invalid role value' });

    const user = await User.findByIdAndUpdate(req.params.id, { role: role.toUpperCase() }, { new: true }).select('name email role address balance');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, address: user.address, balance: user.balance });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await RefreshToken.deleteMany({ user: user._id });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const targetUserId = req.params.id;

    if (!newPassword) return res.status(400).json({ error: 'newPassword is required' });
    if (req.user.id !== targetUserId && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized to change this password' });

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.user.role !== 'ADMIN') {
      if (!oldPassword) return res.status(400).json({ error: 'oldPassword is required' });
      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (!validPassword) return res.status(401).json({ error: 'Old password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
