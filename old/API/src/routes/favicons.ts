import { Router } from 'express';
import { fetchFavicon } from '../controllers/faviconsController';

const router = Router();

router.get('/', fetchFavicon);

export default router;
