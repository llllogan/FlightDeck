import { Router } from 'express';
import { getUserSummary, getUserTabGroups, getUserWorkspace } from '../controllers/usersController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.get('/tab-groups', getUserTabGroups);
router.get('/summary', getUserSummary);
router.get('/workspace', getUserWorkspace);

export default router;
