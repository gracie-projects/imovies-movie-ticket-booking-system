import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

function sendSession(res, user, status = 200) {
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(status).json({ success: true, user });
}

export async function register(req, res) {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');

  const user = new User({ name, email, phone, role: 'user' });
  await user.setPassword(password);
  await user.save();
  sendSession(res, user, 201);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password to avoid account enumeration
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  sendSession(res, user);
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
}

export function me(req, res) {
  res.json({ success: true, user: req.user });
}

export async function updateProfile(req, res) {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ success: true, user: req.user });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.verifyPassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  await user.setPassword(req.body.newPassword);
  await user.save();
  sendSession(res, user);
}
