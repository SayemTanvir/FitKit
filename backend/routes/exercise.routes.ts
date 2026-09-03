import { Router } from 'express';
import { getExercises } from '../controllers/exercise.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, getExercises);

export default router;