const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '3600';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

function generateAccessToken(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: `${JWT_EXPIRES_IN}s` });
}

async function createRefreshToken(user) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token, user: user._id, expiresAt });
  return token;
}

async function removeRefreshToken(token) {
  return RefreshToken.findOneAndDelete({ token });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, address } = req.body;
    const role = 'USER';

    if (!name || !email || !password || !address) {
      return res.status(400).json({ error: 'Name, email, password, and address are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashedPassword, address: address.trim(), role, balance: 1000 });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = await createRefreshToken(newUser);

    res.status(201).json({
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      address: newUser.address,
      balance: newUser.balance,
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      expiresIn: Number(JWT_EXPIRES_IN),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    res.json({ accessToken, refreshToken, expiresIn: Number(JWT_EXPIRES_IN), user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, address: user.address, balance: user.balance } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
    await removeRefreshToken(refreshToken);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
