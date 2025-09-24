import { Router } from 'express';
import { createTab, renameTab, deleteTab, moveTab } from '../controllers/tabsController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.use(requireUserId);
router.post('/', createTab);
router.patch('/:tabId', renameTab);
router.post('/:tabId/move', moveTab);
router.delete('/:tabId', deleteTab);

export default router;
