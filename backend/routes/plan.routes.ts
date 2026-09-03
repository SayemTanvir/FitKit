import { Router } from 'express';
import { createWorkoutPlan, getWorkoutPlans } from '../controllers/plan.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Any authenticated user can view curated workout plans
router.get('/', verifyToken, getWorkoutPlans);

// Admin-only: Blocks members with 403 Forbidden
router.post('/', verifyToken, requireRole('Admin'), createWorkoutPlan);

export default router;