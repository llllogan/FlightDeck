import { Router } from 'express';
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  listEnvironmentsForTabHandler,
} from '../controllers/environmentsController';
import { requireUserId } from '../middleware/userContext';
import { requireEnvironmentAccess, requireTabAccess } from '../middleware/resourceAccess';

const router = Router();

router.use(requireUserId);
router.get('/tabs/:tabId', requireTabAccess(), listEnvironmentsForTabHandler);
router.post(
  '/',
  requireTabAccess({ idSource: 'body', idKey: 'tabId', missingMessage: 'tabId is required' }),
  createEnvironment,
);
router.patch('/:environmentId', requireEnvironmentAccess(), updateEnvironment);
router.delete('/:environmentId', requireEnvironmentAccess(), deleteEnvironment);

export default router;
