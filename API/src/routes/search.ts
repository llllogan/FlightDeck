import { Router } from 'express';
import { searchTabs } from '../controllers/tabSearchController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/tabs', requireAuth(), searchTabs);

export default router;
