import { Router } from 'express';
import { createTab, renameTab, deleteTab, moveTab } from '../controllers/tabsController';
import { requireAuth } from '../middleware/auth';
import { requireTabAccess, requireTabGroupAccess } from '../middleware/resourceAccess';

const router = Router();

router.use(requireAuth());
router.post(
  '/',
  requireTabGroupAccess({ idSource: 'body', idKey: 'tabGroupId', missingMessage: 'tabGroupId is required' }),
  createTab,
);
router.patch('/:tabId', requireTabAccess(), renameTab);
router.post('/:tabId/move', requireTabAccess(), moveTab);
router.delete('/:tabId', requireTabAccess(), deleteTab);

export default router;
