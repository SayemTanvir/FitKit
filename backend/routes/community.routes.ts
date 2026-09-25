import { Router, Response, raw } from 'express';
import pool, { query } from '../db';
import { AuthRequest, clearAccountStateCache, requireRole, verifyToken } from '../middleware/auth.middleware';
import { reactionTypes, toggleReaction } from '../services/reactions';

const router = Router();
router.use(verifyToken);
const member = requireRole('Member');
const mediaPath=(id:number)=>`/api/community/media/${id}`;
const mediaId=(value:unknown)=>{const match=/^\/api\/community\/media\/(\d+)$/.exec(String(value||''));return match?Number(match[1]):null;};
function validImage(data:Buffer,mime:string){
  if(mime==='image/jpeg')return data.length>=3&&data[0]===0xff&&data[1]===0xd8&&data[2]===0xff;
  if(mime==='image/png')return data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/webp')return data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  if(mime==='image/gif')return ['GIF87a','GIF89a'].includes(data.toString('ascii',0,6));
  return false;
}
const integer = (value: unknown) => { const number=Number(value); return Number.isInteger(number)&&number>0?number:null; };
const throttle = new Map<string,number[]>();
function rate(userId: number, action: string, limit: number) {
  const key=`${userId}:${action}`, now=Date.now();
  const recent=(throttle.get(key)||[]).filter((at)=>at>now-60000);
  if(recent.length>=limit) return false;
  recent.push(now);throttle.set(key,recent);return true;
}
async function blocked(a: number,b: number) {
  const result=await query('SELECT 1 FROM UserBlock WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1',[a,b]);
  return !!result.rowCount;
}
async function notify(userId: number,title: string,message: string,link: string) {
  await query(`INSERT INTO Notification (user_id,title,message,notification_type,link_path) VALUES ($1,$2,$3,'System',$4)`,[userId,title,message,link]);
}
async function relation(a: number,b: number) {
  const result=await query(`SELECT mp.is_private,mp.dm_policy,
      (SELECT status FROM FollowRelationship WHERE follower_id=$1 AND followed_id=$2) AS following,
      (SELECT status FROM FollowRelationship WHERE follower_id=$2 AND followed_id=$1) AS follower,
      (SELECT status FROM FriendRequest WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)) AS friendship,
      (SELECT CASE WHEN requester_id=$1 THEN 'Outgoing' ELSE 'Incoming' END FROM FriendRequest WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)) AS friendship_direction
    FROM MemberProfile mp WHERE mp.user_id=$2`,[a,b]);
  return result.rows[0]||null;
}

router.post('/media/:purpose',raw({type:['image/jpeg','image/png','image/webp','image/gif'],limit:'3mb'}),async(req:AuthRequest,res:Response)=>{
  const purposes:Record<string,string>={avatar:'Avatar',post:'Post',programme:'Programme',exercise:'Exercise'};
  const purpose=purposes[String(req.params.purpose)]||null;
  if(!purpose||(purpose==='Programme'||purpose==='Exercise')&&req.user!.role!=='Admin')return res.status(403).json({error:'Image upload is not permitted.'});
  const mime=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
  const data=Buffer.isBuffer(req.body)?req.body:null;
  if(!purpose||!data||data.length<1||data.length>3*1024*1024||!validImage(data,mime))return res.status(400).json({error:'Choose a JPEG, PNG, WebP or GIF image under 3 MB.'});
  const result=await query('INSERT INTO MediaAsset(owner_id,purpose,mime_type,content) VALUES ($1,$2,$3,$4) RETURNING media_id',[req.user!.userId,purpose,mime,data]);
  return res.status(201).json({url:mediaPath(result.rows[0].media_id)});
});
router.get('/media/:id',async(req:AuthRequest,res:Response)=>{
  const id=integer(req.params.id);if(!id)return res.status(404).end();
  const result=await query('SELECT owner_id,purpose,mime_type,content FROM MediaAsset WHERE media_id=$1',[id]);
  if(!result.rowCount)return res.status(404).end();
  const asset=result.rows[0];
  if(asset.owner_id!==req.user!.userId){
    if(await blocked(req.user!.userId,asset.owner_id))return res.status(404).end();
    if(asset.purpose==='Avatar'){
      const linked=await query('SELECT 1 FROM users u LEFT JOIN MemberProfile mp ON mp.user_id=u.user_id WHERE u.user_id=$1 AND (u.profile_photo_url=$2 OR mp.photo_url=$2)',[asset.owner_id,mediaPath(id)]);
      if(!linked.rowCount)return res.status(404).end();
    }else if(asset.purpose==='Post'){
      const posts=await query('SELECT post_id FROM SocialPost WHERE user_id=$1 AND image_url=$2 AND deleted_at IS NULL',[asset.owner_id,mediaPath(id)]);
      let visible=false;for(const post of posts.rows){if(await postVisible(req.user!.userId,post.post_id)){visible=true;break;}}
      if(!visible)return res.status(404).end();
    }else if(asset.purpose==='Programme'){
      const visible=await query(`SELECT 1 FROM TrainingProgramme tp JOIN ProgrammeVersion pv ON pv.programme_id=tp.programme_id
        WHERE (tp.cover_url=$1 OR pv.details_snapshot->>'cover_url'=$1) AND pv.status='Published'
        AND ((tp.archived_at IS NULL AND tp.visibility='public') OR EXISTS (SELECT 1 FROM ProgrammeEnrollment pe WHERE pe.version_id=pv.version_id AND pe.user_id=$2)) LIMIT 1`,[mediaPath(id),req.user!.userId]);
      if(!visible.rowCount)return res.status(404).end();
    }else{
      const visible=await query('SELECT 1 FROM Exercise WHERE media_url=$1 AND is_active=TRUE LIMIT 1',[mediaPath(id)]);
      if(!visible.rowCount)return res.status(404).end();
    }
  }
  res.setHeader('Content-Type',asset.mime_type);
  res.setHeader('Cache-Control',asset.purpose==='Post'?'private, no-store':'private, max-age=60');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.send(asset.content);
});

router.get('/members', member, async (req: AuthRequest,res: Response)=>{
  const q=String(req.query.q||'').trim().slice(0,60), limit=Math.min(Math.max(Number(req.query.limit)||20,1),50);
  const result=await query(`SELECT u.user_id,u.name,mp.username,mp.is_private,mp.photo_url,
      CASE WHEN mp.is_private THEN '' ELSE mp.bio END AS bio
    FROM MemberProfile mp JOIN Member m ON m.user_id=mp.user_id JOIN users u ON u.user_id=mp.user_id
    WHERE mp.user_id<>$1 AND (u.name ILIKE $2 OR mp.username ILIKE $2)
      AND NOT EXISTS (SELECT 1 FROM UserBlock b WHERE (b.blocker_id=$1 AND b.blocked_id=mp.user_id) OR (b.blocker_id=mp.user_id AND b.blocked_id=$1))
    ORDER BY u.name LIMIT $3`,[req.user!.userId,`%${q}%`,limit]);
  return res.json(result.rows);
});

router.get('/members/:id', member, async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id); if(!id) return res.status(400).json({error:'Invalid member ID.'});
  if(await blocked(req.user!.userId,id)) return res.status(404).json({error:'Member not found.'});
  const result=await query(`SELECT u.user_id,u.name,mp.username,mp.bio,mp.interests,mp.photo_url,mp.is_private,mp.dm_policy,u.created_at,
    (SELECT COUNT(*)::int FROM FollowRelationship WHERE followed_id=$1 AND status='Accepted') AS followers,
    (SELECT COUNT(*)::int FROM FollowRelationship WHERE follower_id=$1 AND status='Accepted') AS following,
    (SELECT COUNT(*)::int FROM SocialPost WHERE user_id=$1 AND deleted_at IS NULL) AS posts
    FROM MemberProfile mp JOIN Member m ON m.user_id=mp.user_id JOIN users u ON u.user_id=mp.user_id
    WHERE mp.user_id=$1`,[id]);
  if(!result.rowCount) return res.status(404).json({error:'Member not found.'});
  const rel=await relation(req.user!.userId,id);
  const allowed=id===req.user!.userId||!result.rows[0].is_private||rel?.following==='Accepted'||rel?.friendship==='Accepted';
  return res.json({profile:{...result.rows[0],bio:allowed?result.rows[0].bio:'',interests:allowed?result.rows[0].interests:[],posts:allowed?result.rows[0].posts:null,dm_policy:id===req.user!.userId?result.rows[0].dm_policy:undefined},relationship:{following:rel?.following||null,follower:rel?.follower||null,friendship:rel?.friendship||null,friendship_direction:rel?.friendship_direction||null},can_view:allowed});
});

router.put('/me', member, async (req: AuthRequest,res: Response)=>{
  const username=String(req.body?.username||'').trim().toLowerCase();
  const bio=String(req.body?.bio||'').trim();
  const old=await query('SELECT photo_url FROM MemberProfile WHERE user_id=$1',[req.user!.userId]);
  const photo=req.body?.photo_url===undefined?old.rows[0]?.photo_url||null:req.body.photo_url?String(req.body.photo_url):null;
  const policy=String(req.body?.dm_policy||'Friends');
  if(!/^[a-z0-9_]{3,32}$/.test(username)||bio.length>500||!['Friends','Everyone','None'].includes(policy)||photo&&(!/^https:\/\//i.test(photo)&&!mediaId(photo)||photo.length>1000)) return res.status(400).json({error:'Invalid username, bio, image URL, or message policy.'});
  if(mediaId(photo)){
    const owned=await query("SELECT 1 FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Avatar'",[mediaId(photo),req.user!.userId]);
    if(!owned.rowCount)return res.status(403).json({error:'Profile image does not belong to you.'});
  }
  try{
    const result=await query(`UPDATE MemberProfile SET username=$1,bio=$2,photo_url=$3,is_private=$4,dm_policy=$5,interests=$6,updated_at=CURRENT_TIMESTAMP WHERE user_id=$7 RETURNING *`,[username,bio,photo,req.body?.is_private!==false,policy,Array.isArray(req.body?.interests)?req.body.interests.map(String).slice(0,15):[],req.user!.userId]);
    await query('UPDATE users SET profile_photo_url=$1 WHERE user_id=$2',[photo,req.user!.userId]);
    const oldId=mediaId(old.rows[0]?.photo_url);
    if(oldId&&old.rows[0].photo_url!==photo)await query("DELETE FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Avatar'",[oldId,req.user!.userId]);
    return res.json(result.rows[0]);
  }catch(error:any){if(error.code==='23505')return res.status(409).json({error:'Username already taken.'});throw error;}
});
router.delete('/me/photo',member,async(req:AuthRequest,res:Response)=>{
  const previous=await query('SELECT photo_url FROM MemberProfile WHERE user_id=$1',[req.user!.userId]);
  const current=await query('UPDATE MemberProfile SET photo_url=NULL,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 RETURNING photo_url',[req.user!.userId]);
  if(!current.rowCount)return res.status(404).json({error:'Profile not found.'});
  await query('UPDATE users SET profile_photo_url=NULL WHERE user_id=$1',[req.user!.userId]);
  const oldId=mediaId(previous.rows[0]?.photo_url);
  if(oldId)await query("DELETE FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Avatar'",[oldId,req.user!.userId]);
  return res.json({photo_url:null});
});

router.post('/members/:id/follow', member, async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id),self=req.user!.userId;
  if(!id||id===self) return res.status(400).json({error:'Choose another member.'});
  if(await blocked(self,id)) return res.status(403).json({error:'Following is unavailable.'});
  const rel=await relation(self,id); if(!rel) return res.status(404).json({error:'Member not found.'});
  const status=rel.is_private?'Requested':'Accepted';
  const result=await query(`INSERT INTO FollowRelationship (follower_id,followed_id,status) VALUES ($1,$2,$3) ON CONFLICT (follower_id,followed_id) DO UPDATE SET status=EXCLUDED.status RETURNING *`,[self,id,status]);
  if(status==='Requested') await notify(id,'Follow request','A member requested to follow you.','/community/requests');
  return res.status(201).json(result.rows[0]);
});
router.delete('/members/:id/follow', member, async (req: AuthRequest,res: Response)=>{
  await query('DELETE FROM FollowRelationship WHERE follower_id=$1 AND followed_id=$2',[req.user!.userId,integer(req.params.id)]);
  return res.json({message:'Unfollowed.'});
});
router.patch('/members/:id/follow', member, async (req: AuthRequest,res: Response)=>{
  const action=String(req.body?.action||'');if(!['accept','reject'].includes(action))return res.status(400).json({error:'Choose accept or reject.'});
  const id=integer(req.params.id);
  if(!id)return res.status(400).json({error:'Invalid member ID.'});
  const result=action==='accept'
    ?await query(`UPDATE FollowRelationship SET status='Accepted' WHERE follower_id=$1 AND followed_id=$2 AND status='Requested' RETURNING *`,[id,req.user!.userId])
    :await query(`DELETE FROM FollowRelationship WHERE follower_id=$1 AND followed_id=$2 AND status='Requested' RETURNING *`,[id,req.user!.userId]);
  if(!result.rowCount)return res.status(404).json({error:'Follow request not found.'});
  if(action==='accept')await notify(id,'Follow accepted','Your follow request was accepted.',`/community/members/${req.user!.userId}`);
  return res.json({status:action});
});

router.post('/members/:id/friend', member, async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id),self=req.user!.userId;
  if(!id||id===self)return res.status(400).json({error:'Choose another member.'});
  if(await blocked(self,id))return res.status(403).json({error:'Friendship unavailable.'});
  if(!(await relation(self,id)))return res.status(404).json({error:'Member not found.'});
  const existing=await query('SELECT status FROM FriendRequest WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)',[self,id]);
  if(existing.rowCount&&existing.rows[0].status!=='Rejected')return res.status(409).json({error:'A friendship or pending request already exists.'});
  await query('DELETE FROM FriendRequest WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)',[self,id]);
  const result=await query(`INSERT INTO FriendRequest (requester_id,recipient_id,status) VALUES ($1,$2,'Pending') RETURNING *`,[self,id]);
  await notify(id,'Friend request','A member sent you a friend request.','/community/requests');
  return res.status(201).json(result.rows[0]);
});
router.patch('/members/:id/friend', member, async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id),action=String(req.body?.action||''),self=req.user!.userId;
  if(!id||!['accept','reject','cancel','unfriend'].includes(action))return res.status(400).json({error:'Invalid friendship action.'});
  let result;
  if(action==='accept'||action==='reject')result=await query(`UPDATE FriendRequest SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE requester_id=$2 AND recipient_id=$3 AND status='Pending' RETURNING *`,[action==='accept'?'Accepted':'Rejected',id,self]);
  else result=await query(`DELETE FROM FriendRequest WHERE ((requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)) AND status=$3 RETURNING *`,[self,id,action==='cancel'?'Pending':'Accepted']);
  if(!result.rowCount)return res.status(404).json({error:'Friend request not found.'});
  if(action==='accept')await notify(id,'Friend request accepted','You are now friends.',`/community/members/${self}`);
  return res.json({status:action});
});
router.get('/requests', member, async (req: AuthRequest,res: Response)=>{
  const [follows,friends]=await Promise.all([
    query(`SELECT fr.follower_id AS user_id,u.name,mp.username,mp.photo_url FROM FollowRelationship fr JOIN users u ON u.user_id=fr.follower_id JOIN MemberProfile mp ON mp.user_id=fr.follower_id WHERE fr.followed_id=$1 AND fr.status='Requested'`,[req.user!.userId]),
    query(`SELECT f.requester_id AS user_id,u.name,mp.username,mp.photo_url FROM FriendRequest f JOIN users u ON u.user_id=f.requester_id JOIN MemberProfile mp ON mp.user_id=f.requester_id WHERE f.recipient_id=$1 AND f.status='Pending'`,[req.user!.userId]),
  ]);return res.json({follows:follows.rows,friends:friends.rows});
});
router.get('/friends', member, async (req: AuthRequest,res: Response)=>{
  const result=await query(`SELECT u.user_id,u.name,mp.username,mp.photo_url FROM FriendRequest f JOIN users u ON u.user_id=CASE WHEN f.requester_id=$1 THEN f.recipient_id ELSE f.requester_id END JOIN MemberProfile mp ON mp.user_id=u.user_id WHERE (f.requester_id=$1 OR f.recipient_id=$1) AND f.status='Accepted'`,[req.user!.userId]);return res.json(result.rows);
});
router.post('/members/:id/block', member, async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id),self=req.user!.userId;if(!id||id===self)return res.status(400).json({error:'Invalid member.'});
  const client=await pool.connect();try{await client.query('BEGIN');await client.query('INSERT INTO UserBlock (blocker_id,blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[self,id]);await client.query('DELETE FROM FollowRelationship WHERE (follower_id=$1 AND followed_id=$2) OR (follower_id=$2 AND followed_id=$1)',[self,id]);await client.query('DELETE FROM FriendRequest WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)',[self,id]);await client.query('COMMIT');return res.json({message:'Member blocked.'});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
});
router.delete('/members/:id/block', member, async (req: AuthRequest,res: Response)=>{await query('DELETE FROM UserBlock WHERE blocker_id=$1 AND blocked_id=$2',[req.user!.userId,integer(req.params.id)]);return res.json({message:'Member unblocked.'});});
router.get('/blocks', member, async (req: AuthRequest,res: Response)=>{const result=await query(`SELECT b.blocked_id AS user_id,u.name,mp.username,mp.photo_url FROM UserBlock b JOIN users u ON u.user_id=b.blocked_id JOIN MemberProfile mp ON mp.user_id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC`,[req.user!.userId]);return res.json(result.rows);});

const visibleSql=`p.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM UserBlock b WHERE (b.blocker_id=$1 AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=$1)) AND
  (p.user_id=$1 OR p.visibility='Public' OR
   (p.visibility='Followers' AND EXISTS (SELECT 1 FROM FollowRelationship f WHERE f.follower_id=$1 AND f.followed_id=p.user_id AND f.status='Accepted')) OR
   (p.visibility='Friends' AND EXISTS (SELECT 1 FROM FriendRequest f WHERE ((f.requester_id=$1 AND f.recipient_id=p.user_id) OR (f.recipient_id=$1 AND f.requester_id=p.user_id)) AND f.status='Accepted'))) AND
  (p.user_id=$1 OR NOT EXISTS (SELECT 1 FROM MemberProfile mp WHERE mp.user_id=p.user_id AND mp.is_private=TRUE) OR
   EXISTS (SELECT 1 FROM FollowRelationship f WHERE f.follower_id=$1 AND f.followed_id=p.user_id AND f.status='Accepted') OR
   EXISTS (SELECT 1 FROM FriendRequest f WHERE ((f.requester_id=$1 AND f.recipient_id=p.user_id) OR (f.recipient_id=$1 AND f.requester_id=p.user_id)) AND f.status='Accepted'))`;
async function postVisible(viewer: number,postId: number){const result=await query(`SELECT p.user_id FROM SocialPost p WHERE p.post_id=$2 AND ${visibleSql}`,[viewer,postId]);return result.rows[0]||null;}
router.get('/posts', async (req: AuthRequest,res: Response)=>{
  const scope=String(req.query.scope||'discover'),userId=integer(req.query.user),before=integer(req.query.before),limit=Math.min(Math.max(Number(req.query.limit)||20,1),50);
  if(!['discover','following','mine','user'].includes(scope)||scope==='user'&&!userId)return res.status(400).json({error:'Invalid feed filter.'});
  const result=await query(`SELECT p.post_id,p.user_id,u.name,mp.username,mp.photo_url,p.body,p.image_url,p.visibility,p.created_at,p.updated_at,
    (SELECT COUNT(*)::int FROM PostLike l WHERE l.post_id=p.post_id) AS likes,
    (SELECT COUNT(*)::int FROM PostComment c WHERE c.post_id=p.post_id AND c.deleted_at IS NULL) AS comments,
    EXISTS (SELECT 1 FROM PostLike l WHERE l.post_id=p.post_id AND l.user_id=$1) AS liked,
    reaction.fire_count,reaction.flex_count,reaction.clap_count,reaction.my_reaction
    FROM SocialPost p JOIN users u ON u.user_id=p.user_id JOIN MemberProfile mp ON mp.user_id=p.user_id
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE reaction_type='Fire')::int AS fire_count,
      COUNT(*) FILTER (WHERE reaction_type='Flex')::int AS flex_count,
      COUNT(*) FILTER (WHERE reaction_type='Clap')::int AS clap_count,
      MAX(reaction_type) FILTER (WHERE user_id=$1) AS my_reaction FROM FeedReaction WHERE post_id=p.post_id) reaction ON TRUE
    WHERE ${visibleSql} AND ($2::int IS NULL OR p.post_id<$2)
      AND (CASE $3 WHEN 'mine' THEN p.user_id=$1 WHEN 'user' THEN p.user_id=$4
           WHEN 'following' THEN EXISTS (SELECT 1 FROM FollowRelationship f WHERE f.follower_id=$1 AND f.followed_id=p.user_id AND f.status='Accepted')
           ELSE p.visibility='Public' END)
    ORDER BY p.post_id DESC LIMIT $5`,[req.user!.userId,before,scope,userId,limit]);return res.json(result.rows);
});
router.get('/posts/:id', async (req: AuthRequest,res: Response)=>{
  const postId=integer(req.params.id);
  if(!postId)return res.status(400).json({error:'Invalid post ID.'});
  const result=await query(`SELECT p.post_id,p.user_id,u.name,mp.username,mp.photo_url,p.body,p.image_url,p.visibility,p.created_at,p.updated_at,
    (SELECT COUNT(*)::int FROM PostLike l WHERE l.post_id=p.post_id) AS likes,
    (SELECT COUNT(*)::int FROM PostComment c WHERE c.post_id=p.post_id AND c.deleted_at IS NULL) AS comments,
    EXISTS (SELECT 1 FROM PostLike l WHERE l.post_id=p.post_id AND l.user_id=$1) AS liked,
    reaction.fire_count,reaction.flex_count,reaction.clap_count,reaction.my_reaction
    FROM SocialPost p JOIN users u ON u.user_id=p.user_id JOIN MemberProfile mp ON mp.user_id=p.user_id
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE reaction_type='Fire')::int AS fire_count,
      COUNT(*) FILTER (WHERE reaction_type='Flex')::int AS flex_count,
      COUNT(*) FILTER (WHERE reaction_type='Clap')::int AS clap_count,
      MAX(reaction_type) FILTER (WHERE user_id=$1) AS my_reaction FROM FeedReaction WHERE post_id=p.post_id) reaction ON TRUE
    WHERE p.post_id=$2 AND ${visibleSql}`,[req.user!.userId,postId]);
  if(!result.rowCount)return res.status(404).json({error:'Post not found.'});
  return res.json(result.rows[0]);
});
router.post('/posts', member, async (req: AuthRequest,res: Response)=>{
  if(!rate(req.user!.userId,'post',10))return res.status(429).json({error:'Posting too quickly.'});
  const body=String(req.body?.body||'').trim(),visibility=String(req.body?.visibility||'Private');
  const image=req.body?.image_url?String(req.body.image_url):null;
  if(!body||body.length>3000||!['Public','Followers','Friends','Private'].includes(visibility)||image&&(!/^https:\/\//i.test(image)&&!mediaId(image)||image.length>1000))return res.status(400).json({error:'Provide post text, valid visibility, and an image URL if supplied.'});
  if(mediaId(image)){
    const owned=await query("SELECT 1 FROM MediaAsset WHERE media_id=$1 AND owner_id=$2 AND purpose='Post'",[mediaId(image),req.user!.userId]);
    if(!owned.rowCount)return res.status(403).json({error:'Post image does not belong to you.'});
  }
  const result=await query('INSERT INTO SocialPost (user_id,body,image_url,visibility) VALUES ($1,$2,$3,$4) RETURNING *',[req.user!.userId,body,image,visibility]);return res.status(201).json(result.rows[0]);
});
router.put('/posts/:id', member, async (req: AuthRequest,res: Response)=>{
  const body=String(req.body?.body||'').trim(),visibility=String(req.body?.visibility||'Private');if(!body||body.length>3000||!['Public','Followers','Friends','Private'].includes(visibility))return res.status(400).json({error:'Invalid post.'});
  const result=await query('UPDATE SocialPost SET body=$1,visibility=$2,updated_at=CURRENT_TIMESTAMP WHERE post_id=$3 AND user_id=$4 AND deleted_at IS NULL RETURNING *',[body,visibility,integer(req.params.id),req.user!.userId]);if(!result.rowCount)return res.status(404).json({error:'Post not found.'});return res.json(result.rows[0]);
});
router.delete('/posts/:id', member, async (req: AuthRequest,res: Response)=>{const result=await query('UPDATE SocialPost SET deleted_at=CURRENT_TIMESTAMP WHERE post_id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING post_id',[integer(req.params.id),req.user!.userId]);if(!result.rowCount)return res.status(404).json({error:'Post not found.'});return res.json({message:'Post removed.'});});
router.post('/posts/:id/like', member, async (req: AuthRequest,res: Response)=>{const id=integer(req.params.id),post=await postVisible(req.user!.userId,id||0);if(!post)return res.status(404).json({error:'Post not found.'});const existing=await query('SELECT 1 FROM PostLike WHERE post_id=$1 AND user_id=$2',[id,req.user!.userId]);if(existing.rowCount)await query('DELETE FROM PostLike WHERE post_id=$1 AND user_id=$2',[id,req.user!.userId]);else{await query('INSERT INTO PostLike (post_id,user_id) VALUES ($1,$2)',[id,req.user!.userId]);if(post.user_id!==req.user!.userId)await notify(post.user_id,'New like','Someone liked your post.',`/community/posts/${id}`);}return res.json({liked:!existing.rowCount});});
router.post('/posts/:id/reaction',member,async(req:AuthRequest,res:Response)=>{
  const id=integer(req.params.id),kind=String(req.body?.reaction_type||'');
  if(!id||!reactionTypes.includes(kind as typeof reactionTypes[number]))return res.status(400).json({error:'Invalid reaction.'});
  const post=await postVisible(req.user!.userId,id);if(!post)return res.status(404).json({error:'Post not found.'});
  const result=await toggleReaction('post_id',id,req.user!.userId,kind);
  if(result.my_reaction===kind&&post.user_id!==req.user!.userId)await notify(post.user_id,'New reaction','Someone reacted to your post.',`/community/posts/${id}`);
  return res.json(result);
});
router.get('/posts/:id/comments', async (req: AuthRequest,res: Response)=>{const id=integer(req.params.id);if(!id||!(await postVisible(req.user!.userId,id)))return res.status(404).json({error:'Post not found.'});const result=await query(`SELECT c.comment_id,c.user_id,u.name,mp.photo_url,c.body,c.created_at FROM PostComment c JOIN users u ON u.user_id=c.user_id LEFT JOIN MemberProfile mp ON mp.user_id=c.user_id WHERE c.post_id=$1 AND c.deleted_at IS NULL ORDER BY c.comment_id LIMIT 100`,[id]);return res.json(result.rows);});
router.post('/posts/:id/comments', member, async (req: AuthRequest,res: Response)=>{if(!rate(req.user!.userId,'comment',20))return res.status(429).json({error:'Commenting too quickly.'});const id=integer(req.params.id),post=await postVisible(req.user!.userId,id||0),body=String(req.body?.body||'').trim();if(!post)return res.status(404).json({error:'Post not found.'});if(!body||body.length>1000)return res.status(400).json({error:'Comment must be 1–1000 characters.'});const result=await query('INSERT INTO PostComment (post_id,user_id,body) VALUES ($1,$2,$3) RETURNING *',[id,req.user!.userId,body]);if(post.user_id!==req.user!.userId)await notify(post.user_id,'New comment','Someone commented on your post.',`/community/posts/${id}`);return res.status(201).json(result.rows[0]);});
router.delete('/comments/:id', member, async (req: AuthRequest,res: Response)=>{const result=await query('UPDATE PostComment SET deleted_at=CURRENT_TIMESTAMP WHERE comment_id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING comment_id',[integer(req.params.id),req.user!.userId]);if(!result.rowCount)return res.status(404).json({error:'Comment not found.'});return res.json({message:'Comment deleted.'});});

router.get('/conversations', member, async (req: AuthRequest,res: Response)=>{
  const result=await query(`SELECT DISTINCT ON (other_id) other_id,u.name,mp.username,mp.photo_url,m.body AS last_message,m.created_at,
    (SELECT COUNT(*)::int FROM DirectMessage unread WHERE unread.sender_id=other_id AND unread.recipient_id=$1 AND unread.read_at IS NULL) AS unread
    FROM (SELECT CASE WHEN sender_id=$1 THEN recipient_id ELSE sender_id END AS other_id,body,created_at FROM DirectMessage WHERE sender_id=$1 OR recipient_id=$1) m
    JOIN users u ON u.user_id=other_id JOIN MemberProfile mp ON mp.user_id=other_id
    WHERE NOT EXISTS (SELECT 1 FROM UserBlock b WHERE (b.blocker_id=$1 AND b.blocked_id=other_id) OR (b.blocked_id=$1 AND b.blocker_id=other_id))
    ORDER BY other_id,m.created_at DESC`,[req.user!.userId]);return res.json(result.rows.sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
});
router.get('/messages/:id', member, async (req: AuthRequest,res: Response)=>{const id=integer(req.params.id),self=req.user!.userId;if(!id||await blocked(self,id))return res.status(404).json({error:'Conversation not found.'});const before=integer(req.query.before),result=await query(`SELECT message_id,sender_id,recipient_id,body,created_at,read_at FROM DirectMessage WHERE ((sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)) AND ($3::int IS NULL OR message_id<$3) ORDER BY message_id DESC LIMIT 50`,[self,id,before]);await query('UPDATE DirectMessage SET read_at=CURRENT_TIMESTAMP WHERE sender_id=$1 AND recipient_id=$2 AND read_at IS NULL',[id,self]);return res.json(result.rows.reverse());});
router.post('/messages/:id', member, async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id),self=req.user!.userId,body=String(req.body?.body||'').trim();
  if(!id||id===self||!body||body.length>4000)return res.status(400).json({error:'Invalid recipient or message.'});
  if(!rate(self,'message',30))return res.status(429).json({error:'Messaging too quickly.'});
  if(await blocked(self,id))return res.status(403).json({error:'Messaging unavailable.'});
  const rel=await relation(self,id);
  if(!rel)return res.status(404).json({error:'Member not found.'});
  if(rel.dm_policy==='None'||rel.dm_policy==='Friends'&&rel.friendship!=='Accepted')return res.status(403).json({error:'This member accepts messages from friends only.'});
  const result=await query(`WITH sent AS (
      INSERT INTO DirectMessage (sender_id,recipient_id,body) VALUES ($1,$2,$3) RETURNING *
    ), notification AS (
      INSERT INTO Notification (user_id,title,message,notification_type,link_path)
      SELECT $2,'New message','You have a new message.','System',$4 FROM sent
    ) SELECT * FROM sent`,[self,id,body,`/messages/${self}`]);
  return res.status(201).json(result.rows[0]);
});

router.get('/notifications', async (req: AuthRequest,res: Response)=>{const before=integer(req.query.before),result=await query('SELECT notification_id,title,message,notification_type,link_path,is_read,created_at FROM Notification WHERE user_id=$1 AND ($2::int IS NULL OR notification_id<$2) ORDER BY notification_id DESC LIMIT 50',[req.user!.userId,before]);return res.json(result.rows);});
router.patch('/notifications/:id', async (req: AuthRequest,res: Response)=>{const result=await query('UPDATE Notification SET is_read=TRUE WHERE notification_id=$1 AND user_id=$2 RETURNING notification_id',[integer(req.params.id),req.user!.userId]);if(!result.rowCount)return res.status(404).json({error:'Notification not found.'});return res.json(result.rows[0]);});
router.delete('/notifications/:id', async (req: AuthRequest,res: Response)=>{const result=await query('DELETE FROM Notification WHERE notification_id=$1 AND user_id=$2 RETURNING notification_id',[integer(req.params.id),req.user!.userId]);if(!result.rowCount)return res.status(404).json({error:'Notification not found.'});return res.json({message:'Notification deleted.'});});
router.delete('/notifications', async (req: AuthRequest,res: Response)=>{await query('DELETE FROM Notification WHERE user_id=$1',[req.user!.userId]);return res.json({message:'Notifications cleared.'});});
router.post('/reports', member, async (req: AuthRequest,res: Response)=>{
  const type=String(req.body?.target_type||''),targetId=integer(req.body?.target_id),reason=String(req.body?.reason||'').trim();
  if(!['Member','Post','Comment','Message'].includes(type)||!targetId||reason.length<5||reason.length>500)return res.status(400).json({error:'Provide a valid target and a reason of 5–500 characters.'});
  if(!rate(req.user!.userId,'report',5))return res.status(429).json({error:'Too many reports.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const result=await client.query('INSERT INTO ContentReport (reporter_id,target_type,target_id,reason) VALUES ($1,$2,$3,$4) RETURNING report_id',[req.user!.userId,type,targetId,reason]);
    await client.query(
      `INSERT INTO Notification (user_id,title,message,notification_type,link_path)
       SELECT a.user_id,'New moderation report',$1,'System','/moderation' FROM Admin a WHERE a.is_active=TRUE`,
      [`${type} #${targetId} was reported and needs review.`]
    );
    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  }catch(error){
    await client.query('ROLLBACK');
    console.error('Create report:',error);
    return res.status(500).json({error:'Could not submit report.'});
  }finally{client.release();}
});
router.get('/moderation/reports', requireRole('Admin'), async (_req: AuthRequest,res: Response)=>{const result=await query(`SELECT r.*,u.name AS reporter_name,mp.photo_url FROM ContentReport r JOIN users u ON u.user_id=r.reporter_id LEFT JOIN MemberProfile mp ON mp.user_id=r.reporter_id WHERE r.status='Open' ORDER BY r.created_at DESC LIMIT 100`);return res.json(result.rows);});
router.patch('/moderation/reports/:id', requireRole('Admin'), async (req: AuthRequest,res: Response)=>{const status=String(req.body?.status||''),note=String(req.body?.note||'').slice(0,2000),remove=req.body?.remove===true;if(!['Resolved','Dismissed'].includes(status)||remove&&status!=='Resolved')return res.status(400).json({error:'Choose a valid moderation decision.'});const client=await pool.connect();try{await client.query('BEGIN');const result=await client.query(`UPDATE ContentReport SET status=$1,reviewer_id=$2,resolved_at=CURRENT_TIMESTAMP WHERE report_id=$3 AND status='Open' RETURNING *`,[status,req.user!.userId,integer(req.params.id)]);if(!result.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Open report not found.'});}const report=result.rows[0];if(remove&&report.target_type==='Post')await client.query('UPDATE SocialPost SET deleted_at=CURRENT_TIMESTAMP WHERE post_id=$1',[report.target_id]);if(remove&&report.target_type==='Comment')await client.query('UPDATE PostComment SET deleted_at=CURRENT_TIMESTAMP WHERE comment_id=$1',[report.target_id]);await client.query('INSERT INTO ModerationAction (admin_id,report_id,action,note) VALUES ($1,$2,$3,$4)',[req.user!.userId,report.report_id,remove?`Remove${report.target_type}`:status,note]);await client.query('COMMIT');return res.json(report);}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}});
router.patch('/moderation/members/:id/suspension', requireRole('Admin'), async (req: AuthRequest,res: Response)=>{
  const id=integer(req.params.id),suspend=req.body?.suspend===true,note=String(req.body?.note||'').slice(0,2000);
  if(!id||id===req.user!.userId)return res.status(400).json({error:'Invalid member.'});
  const client=await pool.connect();try{await client.query('BEGIN');const result=await client.query(`UPDATE users SET suspended_at=CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END WHERE user_id=$2 AND EXISTS (SELECT 1 FROM Member WHERE user_id=$2) AND NOT EXISTS (SELECT 1 FROM Admin WHERE user_id=$2 AND is_active=TRUE) RETURNING user_id,suspended_at`,[suspend,id]);if(!result.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Member not found or is an active admin.'});}await client.query('INSERT INTO ModerationAction (admin_id,action,note) VALUES ($1,$2,$3)',[req.user!.userId,suspend?'SuspendMember':'RestoreMember',`${id}: ${note}`]);await client.query('COMMIT');clearAccountStateCache(id);return res.json(result.rows[0]);}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
});

export default router;
