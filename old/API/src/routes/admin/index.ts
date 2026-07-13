import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import adminUsersRouter from './users';
import adminSessionsRouter from './sessions';

const router = Router();

router.use(requireAuth({ requireAdmin: true }));
router.use('/users', adminUsersRouter);
router.use('/sessions', adminSessionsRouter);

export default router;
