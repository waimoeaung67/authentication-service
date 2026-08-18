const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const crypto = require('crypto');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/authdb';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '3600';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  address: { type: String, required: true, trim: true },
  balance: { type: Number, default: 1000 },
}, { timestamps: true });

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

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

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = payload;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Authentication service is running' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/user/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user-profile.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-profile.html'));
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, address , role} = req.body;

    if (!name || !email || !password || !address) {
      return res.status(400).json({ error: 'Name, email, password, and address are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      address: address.trim(),
      role: role || 'USER',
      balance: 1000,
    });

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
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    res.json({
      accessToken,
      refreshToken,
      expiresIn: Number(JWT_EXPIRES_IN),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    await removeRefreshToken(refreshToken);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role address balance');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      balance: user.balance,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const { name, address } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (address) updates.address = address.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('name email role address balance');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      balance: user.balance,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/validate', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    userId: req.user.id,
    role: req.user.role,
  });
});

app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find().select('name email role address balance');
    res.json(users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      balance: user.balance,
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role address balance');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      balance: user.balance,
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/role', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['USER', 'ADMIN'];
    if (!role || !allowedRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role value' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role: role.toUpperCase() }, { new: true }).select('name email role address balance');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      balance: user.balance,
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await RefreshToken.deleteMany({ user: user._id });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const targetUserId = req.params.id;

    if (!newPassword) {
      return res.status(400).json({ error: 'newPassword is required' });
    }

    if (req.user.id !== targetUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to change this password' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role !== 'ADMIN') {
      if (!oldPassword) {
        return res.status(400).json({ error: 'oldPassword is required' });
      }

      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Old password is incorrect' });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Authentication service listening on port ${PORT}`);
});
