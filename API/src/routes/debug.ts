import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listUsers } from '../db/resourceAccess';

const router = Router();

router.use(requireAuth({ requireAdmin: true }));

router.get('/users', async (_req, res) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch debug users', error);
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

export default router;
