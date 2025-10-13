import { Router } from 'express';
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  listEnvironmentsForTabHandler,
} from '../controllers/environmentsController';
import { requireAuth } from '../middleware/auth';
import { requireEnvironmentAccess, requireTabAccess } from '../middleware/resourceAccess';

const router = Router();

router.use(requireAuth());
router.get('/tabs/:tabId', requireTabAccess(), listEnvironmentsForTabHandler);
router.post(
  '/',
  requireTabAccess({ idSource: 'body', idKey: 'tabId', missingMessage: 'tabId is required' }),
  createEnvironment,
);
router.patch('/:environmentId', requireEnvironmentAccess(), updateEnvironment);
router.delete('/:environmentId', requireEnvironmentAccess(), deleteEnvironment);

export default router;
