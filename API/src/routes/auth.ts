import { Router } from 'express';
import { login, logout, refreshToken, getSession } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/session', requireAuth({ requireAdmin: true }), getSession);

export default router;
