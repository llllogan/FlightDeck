import { Router } from 'express';
import { listTabs, createTab, renameTab, deleteTab } from '../controllers/tabsController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.get('/', listTabs);
router.post('/', createTab);
router.patch('/:tabId', renameTab);
router.delete('/:tabId', deleteTab);

export default router;
