import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUserDetails,
  deleteUserById,
} from '../../controllers/usersController';

const router = Router();

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:userId', updateUserDetails);
router.delete('/:userId', deleteUserById);

export default router;
