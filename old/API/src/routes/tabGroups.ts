import { Router } from 'express';
import {
  listTabGroups,
  createTabGroup,
  renameTabGroup,
  deleteTabGroup,
  moveTabGroup,
  getTabGroupSummary,
  listTabsForGroup,
} from '../controllers/tabGroupsController';
import { requireAuth } from '../middleware/auth';
import { requireTabGroupAccess } from '../middleware/resourceAccess';

const router = Router();

router.use(requireAuth());
router.get('/', listTabGroups);
router.post('/', createTabGroup);
router.get('/summary', getTabGroupSummary);
router.patch('/:tabGroupId', requireTabGroupAccess(), renameTabGroup);
router.post('/:tabGroupId/move', requireTabGroupAccess(), moveTabGroup);
router.delete('/:tabGroupId', requireTabGroupAccess(), deleteTabGroup);
router.get('/:tabGroupId/tabs', requireTabGroupAccess(), listTabsForGroup);

export default router;
