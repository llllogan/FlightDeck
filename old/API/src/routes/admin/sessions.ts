import { Router } from 'express';
import { deleteAdminSession, listAdminSessions } from '../../controllers/adminSessionsController';

const router = Router();

router.get('/', listAdminSessions);
router.delete('/:sessionId', deleteAdminSession);

export default router;
