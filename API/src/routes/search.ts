import { Router } from 'express';
import { searchTabs } from '../controllers/tabSearchController';
import { requireUserId } from '../middleware/userContext';

const router = Router();

router.get('/tabs', requireUserId, searchTabs);

export default router;
