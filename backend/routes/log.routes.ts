import { Router } from 'express';
import { 
  logWorkout, 
  getMyWorkoutLogs, 
  deleteWorkoutLog, 
  logSteps 
} from '../controllers/log.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Member-only guard: Blocks non-members and unauthenticated requests
router.use(verifyToken, requireRole('Member'));

router.post('/workout', logWorkout);
router.get('/workout', getMyWorkoutLogs);
router.delete('/workout/:id', deleteWorkoutLog);
router.post('/steps', logSteps);

export default router;