import { Router } from 'express';
import { getEnvironments } from '../controllers/constsController';

const router = Router();

router.get('/environments', getEnvironments);

export default router;
