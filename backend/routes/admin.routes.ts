import { Router, Response } from 'express';
import { query } from '../db';
import { AuthRequest, requireRole, verifyToken } from '../middleware/auth.middleware';

const router=Router();
router.get('/overview',verifyToken,requireRole('Admin'),async (_req:AuthRequest,res:Response)=>{
  const result=await query(`SELECT
    (SELECT COUNT(*)::int FROM Member) AS members,
    (SELECT COUNT(*)::int FROM Exercise WHERE is_active=TRUE) AS exercises,
    (SELECT COUNT(*)::int FROM TrainingProgramme WHERE archived_at IS NULL) AS programmes,
    (SELECT COUNT(*)::int FROM ProgrammeVersion WHERE status='Published') AS published_versions,
    (SELECT COUNT(*)::int FROM ProgrammeEnrollment) AS enrollments,
    (SELECT COUNT(*)::int FROM WorkoutSessionLog WHERE status='Completed') AS completed_sessions,
    (SELECT COUNT(*)::int FROM SocialPost WHERE deleted_at IS NULL) AS posts,
    (SELECT COUNT(*)::int FROM DirectMessage) AS messages,
    (SELECT COUNT(*)::int FROM ContentReport WHERE status='Open') AS open_reports`);
  return res.json(result.rows[0]);
});
export default router;
