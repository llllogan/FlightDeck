import { Router } from 'express';
import {
  login,
  logout,
  refreshToken,
  getSession,
  checkUsernameAvailability,
  register,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/session', requireAuth({ requireAdmin: true }), getSession);
router.get('/username-available', checkUsernameAvailability);
router.post('/register', register);

export default router;
