import { Router } from 'express';
import { getUserSummary, getUserTabGroups, getUserWorkspace } from '../controllers/usersController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth());
router.get('/tab-groups', getUserTabGroups);
router.get('/summary', getUserSummary);
router.get('/workspace', getUserWorkspace);

export default router;
