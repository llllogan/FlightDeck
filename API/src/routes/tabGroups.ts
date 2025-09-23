import { Router } from 'express';
import {
  listTabGroups,
  createTabGroup,
  renameTabGroup,
  deleteTabGroup,
  getTabGroupSummary,
  listTabsForGroup,
} from '../controllers/tabGroupsController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.get('/', listTabGroups);
router.post('/', createTabGroup);
router.get('/summary', getTabGroupSummary);
router.patch('/:tabGroupId', renameTabGroup);
router.delete('/:tabGroupId', deleteTabGroup);
router.get('/:tabGroupId/tabs', listTabsForGroup);

export default router;
