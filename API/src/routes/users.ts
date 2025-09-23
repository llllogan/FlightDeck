import { Router } from 'express';
import {
  createUser,
  deleteUser,
  getUserSummary,
  getUserTabGroups,
} from '../controllers/usersController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.post('/', createUser);
router.use(requireUserId);
router.delete('/', deleteUser);
router.get('/tab-groups', getUserTabGroups);
router.get('/summary', getUserSummary);

export default router;
