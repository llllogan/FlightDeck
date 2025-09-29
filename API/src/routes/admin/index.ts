import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import adminUsersRouter from './users';

const router = Router();

router.use(requireAuth({ requireAdmin: true }));
router.use('/users', adminUsersRouter);

export default router;
