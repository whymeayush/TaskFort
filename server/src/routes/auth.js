import express from 'express';
import { login, register, getProfile, listAllUsers } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/profile', authenticate, getProfile);
router.get('/users', authenticate, listAllUsers);

export default router;
