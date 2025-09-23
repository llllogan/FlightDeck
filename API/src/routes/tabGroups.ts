import { Router } from 'express';
import {
  listTabGroups,
  createTabGroup,
  renameTabGroup,
  deleteTabGroup,
  getTabGroupSummary,
} from '../controllers/tabGroupsController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.get('/', listTabGroups);
router.post('/', createTabGroup);
router.patch('/:tabGroupId', renameTabGroup);
router.delete('/:tabGroupId', deleteTabGroup);
router.get('/summary', getTabGroupSummary);

export default router;
