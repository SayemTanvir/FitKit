import { query } from '../db';

type Target = 'feed_id' | 'post_id';
export const reactionTypes = ['Fire','Flex','Clap'] as const;

export async function reactionCounts(target:Target,id:number,userId:number){
  const result=await query(`SELECT COUNT(*) FILTER (WHERE reaction_type='Fire')::int AS fire_count,
    COUNT(*) FILTER (WHERE reaction_type='Flex')::int AS flex_count,
    COUNT(*) FILTER (WHERE reaction_type='Clap')::int AS clap_count,
    MAX(reaction_type) FILTER (WHERE user_id=$1) AS my_reaction
    FROM FeedReaction WHERE ${target}=$2`,[userId,id]);
  return result.rows[0];
}

export async function toggleReaction(target:Target,id:number,userId:number,reactionType:string){
  const current=await query(`SELECT reaction_type FROM FeedReaction WHERE user_id=$1 AND ${target}=$2`,[userId,id]);
  if(current.rows[0]?.reaction_type===reactionType){
    await query(`DELETE FROM FeedReaction WHERE user_id=$1 AND ${target}=$2`,[userId,id]);
  }else{
    await query(`INSERT INTO FeedReaction (user_id,${target},reaction_type) VALUES ($1,$2,$3)
      ON CONFLICT (user_id,${target}) DO UPDATE SET reaction_type=EXCLUDED.reaction_type,reacted_at=CURRENT_TIMESTAMP`,[userId,id,reactionType]);
  }
  return reactionCounts(target,id,userId);
}
