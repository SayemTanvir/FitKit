import { Router } from 'express';
import { getSocialFeed } from '../controllers/social.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();
router.get('/feed', verifyToken, getSocialFeed);

export default router;