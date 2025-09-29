import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUserDetails,
  deleteUser,
  getUserSummary,
  getUserTabGroups,
  getUserWorkspace,
} from '../controllers/usersController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:userId', updateUserDetails);
router.use(requireUserId);
router.delete('/', deleteUser);
router.get('/tab-groups', getUserTabGroups);
router.get('/summary', getUserSummary);
router.get('/workspace', getUserWorkspace);

export default router;
