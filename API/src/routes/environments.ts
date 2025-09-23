import { Router } from 'express';
import {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '../controllers/environmentsController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.get('/', listEnvironments);
router.post('/', createEnvironment);
router.patch('/:environmentId', updateEnvironment);
router.delete('/:environmentId', deleteEnvironment);

export default router;
