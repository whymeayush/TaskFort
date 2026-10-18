import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { TeamMembership } from '../models/TeamMembership.js';
import { config } from '../config/index.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHENTICATED',
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'UNAUTHENTICATED',
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, systemRole: user.systemRole },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    const memberships = await TeamMembership.find({ userId: user._id, status: 'ACTIVE' })
      .populate('teamId', 'name code');

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        avatarColor: user.avatarColor,
        memberships: memberships.map(m => ({
          teamId: m.teamId._id,
          teamName: m.teamId.name,
          teamCode: m.teamId.code,
          roleInTeam: m.roleInTeam
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Name, email, and password (min 6 characters) are required'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        error: 'DUPLICATE_KEY_ERROR',
        message: 'A user with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      systemRole: 'TEAM_MEMBER'
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, systemRole: user.systemRole },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        avatarColor: user.avatarColor,
        memberships: []
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res) {
  res.json({
    user: req.user
  });
}

export async function listAllUsers(req, res, next) {
  try {
    const users = await User.find({ accountStatus: 'ACTIVE' })
      .select('-passwordHash')
      .sort({ name: 1 })
      .lean();

    const memberships = await TeamMembership.find({ status: 'ACTIVE' })
      .populate('teamId', 'name code')
      .lean();

    const usersWithTeams = users.map(u => ({
      ...u,
      id: u._id,
      teams: memberships
        .filter(m => m.userId.toString() === u._id.toString())
        .map(m => ({
          teamId: m.teamId._id,
          teamName: m.teamId.name,
          teamCode: m.teamId.code,
          roleInTeam: m.roleInTeam
        }))
    }));

    res.json(usersWithTeams);
  } catch (err) {
    next(err);
  }
}
