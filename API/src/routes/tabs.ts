import { Router } from 'express';
import { createTab, renameTab, deleteTab } from '../controllers/tabsController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.post('/', createTab);
router.patch('/:tabId', renameTab);
router.delete('/:tabId', deleteTab);

export default router;
