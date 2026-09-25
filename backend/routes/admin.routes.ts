import { NextFunction, Router, Response } from 'express';
import pool, { query } from '../db';
import { AuthRequest, clearAccountStateCache, requireRole, verifyToken } from '../middleware/auth.middleware';

const router=Router();
router.get('/overview',verifyToken,requireRole('Admin'),async (req:AuthRequest,res:Response)=>{
  const result=await query(`SELECT
    EXISTS(SELECT 1 FROM Admin WHERE user_id=$1 AND is_active=TRUE AND can_manage_admins=TRUE) AS can_manage_admins,
    (SELECT COUNT(*)::int FROM Member) AS members,
    (SELECT COUNT(*)::int FROM Admin WHERE is_active=TRUE) AS admins,
    (SELECT COUNT(*)::int FROM Exercise WHERE is_active=TRUE) AS exercises,
    (SELECT COUNT(*)::int FROM TrainingProgramme WHERE archived_at IS NULL) AS programmes,
    (SELECT COUNT(*)::int FROM ProgrammeVersion WHERE status='Published') AS published_versions,
    (SELECT COUNT(*)::int FROM ProgrammeEnrollment) AS enrollments,
    (SELECT COUNT(*)::int FROM WorkoutSessionLog WHERE status='Completed') AS completed_sessions,
    (SELECT COUNT(*)::int FROM SocialPost WHERE deleted_at IS NULL) AS posts,
    (SELECT COUNT(*)::int FROM DirectMessage) AS messages,
    (SELECT COUNT(*)::int FROM ContentReport WHERE status='Open') AS open_reports`,[req.user!.userId]);
  return res.json(result.rows[0]);
});

async function requireAdminManager(req:AuthRequest,res:Response,next:NextFunction){
  try{
    const access=await query('SELECT 1 FROM Admin WHERE user_id=$1 AND is_active=TRUE AND can_manage_admins=TRUE',[req.user!.userId]);
    if(!access.rowCount)return res.status(403).json({error:'Only the main admin can manage admin access.'});
    next();
  }catch(error){next(error);}
}

router.get('/role-assignments',verifyToken,requireRole('Admin'),requireAdminManager,async (_req:AuthRequest,res:Response)=>{
  const result=await query(`SELECT u.user_id,u.name,u.email,u.created_at,u.suspended_at,
      CASE WHEN a.user_id IS NOT NULL AND a.is_active=TRUE THEN 'Admin' ELSE 'Member' END AS role,
      COALESCE(a.can_manage_admins,FALSE) AS can_manage_admins
    FROM users u
    LEFT JOIN Member m ON m.user_id=u.user_id
    LEFT JOIN Admin a ON a.user_id=u.user_id
    WHERE m.user_id IS NOT NULL OR (a.user_id IS NOT NULL AND a.is_active=TRUE)
    ORDER BY CASE WHEN a.can_manage_admins THEN 0 WHEN a.is_active THEN 1 ELSE 2 END,u.name,u.user_id`);
  return res.json(result.rows);
});

router.post('/admins/:id',verifyToken,requireRole('Admin'),requireAdminManager,async (req:AuthRequest,res:Response)=>{
  const userId=Number(req.params.id);
  if(!Number.isInteger(userId)||userId<1)return res.status(400).json({error:'Invalid user ID.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const target=await client.query(`SELECT u.user_id,u.name,u.suspended_at,m.user_id AS member_id,a.is_active
      FROM users u LEFT JOIN Member m ON m.user_id=u.user_id LEFT JOIN Admin a ON a.user_id=u.user_id
      WHERE u.user_id=$1 FOR UPDATE OF u`,[userId]);
    if(!target.rowCount||!target.rows[0].member_id){await client.query('ROLLBACK');return res.status(404).json({error:'Member not found.'});}
    if(target.rows[0].suspended_at){await client.query('ROLLBACK');return res.status(409).json({error:'A suspended member cannot be made an admin.'});}
    if(target.rows[0].is_active){await client.query('ROLLBACK');return res.status(409).json({error:'This member is already an admin.'});}
    await client.query(`INSERT INTO Admin (user_id,admin_role,department,can_curate_plans,is_active,can_manage_admins)
      VALUES ($1,'Admin','Operations',TRUE,TRUE,FALSE)
      ON CONFLICT (user_id) DO UPDATE SET admin_role='Admin',is_active=TRUE,can_manage_admins=FALSE`,[userId]);
    await client.query('COMMIT');
    clearAccountStateCache(userId);
    return res.status(201).json({user_id:userId,role:'Admin',message:`${target.rows[0].name} is now an admin. They must sign in again.`});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});

router.delete('/admins/:id',verifyToken,requireRole('Admin'),requireAdminManager,async (req:AuthRequest,res:Response)=>{
  const userId=Number(req.params.id);
  if(!Number.isInteger(userId)||userId<1)return res.status(400).json({error:'Invalid user ID.'});
  if(userId===req.user!.userId)return res.status(400).json({error:'The main admin cannot remove their own access.'});
  const result=await query(`UPDATE Admin SET is_active=FALSE
    WHERE user_id=$1 AND is_active=TRUE AND can_manage_admins=FALSE RETURNING user_id`,[userId]);
  if(!result.rowCount)return res.status(404).json({error:'Removable admin not found.'});
  clearAccountStateCache(userId);
  return res.json({user_id:userId,role:'Member',message:'Admin access removed. The account is a member again and must sign in again.'});
});
export default router;
