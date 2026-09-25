import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addComment, answerFollow, answerFriend, blockMember, blockedMembers, createPost, deleteComment, deletePost, discoverMembers, editPost, followMember, friendMember, getMember, getPost, listComments, listFriends, listPosts, pendingRequests, reactToPost, removeProfilePhoto, reportContent, togglePostLike, unfollowMember, unblockMember, updateSocialProfile } from '../services/community';
import UserAvatar, { StoredImage } from '../components/UserAvatar';
import ReactionBar from '../components/ReactionBar';
import { type ReactionType } from '../services/reactions';
import ImageUploadField from '../components/ImageUploadField';
import { formatBangladeshDate, formatBangladeshDateTime } from '../utils/time';

const me=()=>Number(JSON.parse(localStorage.getItem('user')||'{}').id);

export function CommunityFeed(){
  const [scope,setScope]=useState<'discover'|'following'|'mine'>('discover'),[posts,setPosts]=useState<any[]>([]),[body,setBody]=useState(''),[visibility,setVisibility]=useState('Private'),[image,setImage]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[uploadBusy,setUploadBusy]=useState(false);
  const load=async(selected=scope)=>{setLoading(true);try{setPosts(await listPosts(selected));setError('');}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load(scope);},[scope]);
  const publish=async(event:React.FormEvent)=>{event.preventDefault();if(uploadBusy)return;setBusy(true);try{await createPost(body,visibility,image||undefined);setBody('');setImage('');toast.success('Post published');await load();}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  const more=async()=>{try{const older=await listPosts(scope,undefined,posts.at(-1)?.post_id);setPosts((previous)=>[...previous,...older]);}catch(e:any){toast.error(e.message);}};
  return <div className="max-w-3xl space-y-5"><div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Community</h1><p className="text-sm text-slate-400 mt-1">Share what you choose. Your health measurements and private workout notes are never posted automatically.</p><div className="flex gap-4 text-sm mt-4"><Link to="/community/people" className="text-cyan-300">Find members</Link><Link to="/community/requests" className="text-cyan-300">Requests & friends</Link></div></div><form onSubmit={publish} className="glass rounded-2xl p-5 space-y-3"><label className="text-sm text-white font-semibold">Create a post<textarea required maxLength={3000} value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Share a workout, milestone, or thought..." className="input-pro mt-2 w-full min-h-28" /></label><div className="flex flex-wrap gap-3"><select aria-label="Post visibility" value={visibility} onChange={(e)=>setVisibility(e.target.value)} className="input-pro w-40"><option>Private</option><option>Friends</option><option>Followers</option><option>Public</option></select><button disabled={busy||uploadBusy} className="btn-primary rounded-xl px-5 py-2 font-semibold text-sm disabled:opacity-50">{busy?'Posting...':'Publish'}</button></div><ImageUploadField label="Post image (optional)" value={image} onChange={setImage} purpose="post" onBusyChange={setUploadBusy}/></form><div className="flex gap-2">{(['discover','following','mine'] as const).map((value)=><button type="button" key={value} onClick={()=>setScope(value)} className={`rounded-xl px-4 py-2 text-sm capitalize ${scope===value?'bg-lime-400 text-slate-900':'glass text-slate-300'}`}>{value}</button>)}</div>{loading&&<p className="text-slate-400">Loading posts...</p>}{error&&<p role="alert" className="text-red-300">{error}</p>}{!loading&&!posts.length&&<p className="glass rounded-2xl p-5 text-slate-400">No visible posts yet.</p>}{posts.map((post)=><PostCard key={post.post_id} post={post} onChanged={()=>load()} onDeleted={()=>setPosts((current)=>current.filter((item)=>item.post_id!==post.post_id))} />)}{posts.length>=20&&<button type="button" onClick={more} className="text-cyan-300 text-sm">Load older posts</button>}</div>;
}

function PostCard({
  post,
  onChanged,
  onDeleted,
}: {
  post: any;
  onChanged: () => void;
  onDeleted?: () => void;
}) {
  const [liked, setLiked] = useState(post.liked),
    [likes, setLikes] = useState(Number(post.likes)),
    [comments, setComments] = useState<any[] | null>(null),
    [comment, setComment] = useState(""),
    [editing, setEditing] = useState(false),
    [text, setText] = useState(post.body),
    [visibility, setVisibility] = useState(post.visibility);
  const [reactionCounts, setReactionCounts] = useState<
      Record<ReactionType, number>
    >({
      Fire: Number(post.fire_count || 0),
      Flex: Number(post.flex_count || 0),
      Clap: Number(post.clap_count || 0),
    }),
    [activeReaction, setActiveReaction] = useState<ReactionType | null>(
      post.my_reaction || null,
    ),
    [reacting, setReacting] = useState(false);
  const react = async (type: ReactionType) => {
    if (reacting) return;
    setReacting(true);
    try {
      const result = await reactToPost(post.post_id, type);
      setReactionCounts({
        Fire: Number(result.fire_count),
        Flex: Number(result.flex_count),
        Clap: Number(result.clap_count),
      });
      setActiveReaction(result.my_reaction || null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReacting(false);
    }
  };
  const like = async () => {
    try {
      const result = await togglePostLike(post.post_id);
      setLiked(result.liked);
      setLikes((n) => n + (result.liked ? 1 : -1));
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const openComments = async () => {
    try {
      setComments(await listComments(post.post_id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const saveComment = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await addComment(post.post_id, comment);
      setComment("");
      await openComments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const remove = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost(post.post_id);
      if (onDeleted) onDeleted();
      else onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const saveEdit = async () => {
    try {
      await editPost(post.post_id, text, visibility);
      post.body = text;
      post.visibility = visibility;
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const report = async () => {
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason) return;
    try {
      await reportContent("Post", post.post_id, reason);
      toast.success("Report submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <article className="glass rounded-2xl p-5">
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <UserAvatar name={post.name} photoUrl={post.photo_url} />
          <div>
            <Link
              to={`/community/members/${post.user_id}`}
              className="text-sm font-semibold text-white hover:text-lime-300"
            >
              {post.name}
            </Link>
            <p className="text-xs text-slate-500">
              @{post.username} · {formatBangladeshDateTime(post.created_at)} ·{" "}
              {post.visibility}
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          {post.user_id === me() ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className="text-cyan-300"
              >
                Edit
              </button>
              <button type="button" onClick={remove} className="text-red-300">
                Delete
              </button>
            </>
          ) : (
            <button type="button" onClick={report} className="text-slate-400">
              Report
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <div className="space-y-2 mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-pro w-full min-h-20"
          />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="input-pro"
          >
            <option>Public</option>
            <option>Followers</option>
            <option>Friends</option>
            <option>Private</option>
          </select>
          <button
            type="button"
            onClick={saveEdit}
            className="text-cyan-300 text-sm"
          >
            Save changes
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-200 whitespace-pre-wrap mt-4">
            {post.body}
          </p>
          {post.image_url && (
            <StoredImage
              url={post.image_url}
              alt="Post attachment"
              className="max-h-96 rounded-xl mt-3"
            />
          )}
        </>
      )}
      <div className="flex gap-5 text-xs text-slate-300 mt-4">
        <button
          type="button"
          onClick={like}
          className={liked ? "text-lime-300" : ""}
        >
          ♥ {likes} likes
        </button>
        <button type="button" onClick={openComments}>
          {post.comments} comments
        </button>
      </div>
      <div className="mt-3">
        <ReactionBar
          counts={reactionCounts}
          active={activeReaction}
          onReact={react}
          disabled={reacting}
        />
      </div>
      {comments && (
        <div className="border-t border-white/10 mt-4 pt-3 space-y-3">
          {comments.map((entry) => (
            <div
              key={entry.comment_id}
              className="flex justify-between text-xs gap-2"
            >
              <div className="flex items-start gap-2">
                <UserAvatar
                  name={entry.name}
                  photoUrl={entry.photo_url}
                  className="w-6 h-6"
                />
                <p className="text-slate-300">
                  <span className="font-semibold text-white">
                    {entry.name}:
                  </span>{" "}
                  {entry.body}
                </p>
              </div>
              {entry.user_id === me() && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteComment(entry.comment_id);
                    openComments();
                  }}
                  className="text-red-300"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          <form onSubmit={saveComment} className="flex gap-2">
            <input
              required
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment"
              className="input-pro flex-1"
            />
            <button className="text-cyan-300 text-xs">Send</button>
          </form>
        </div>
      )}
    </article>
  );
}

export function CommunityPost(){
  const {id}=useParams();
  const [post,setPost]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const load=useCallback(()=>getPost(Number(id)).then((item)=>{setPost(item);setError('');}).catch((e)=>{setPost(null);setError(e.message);}).finally(()=>setLoading(false)),[id]);
  useEffect(()=>{load();},[load]);
  return <div className="max-w-3xl space-y-4"><Link to="/community" className="text-sm text-cyan-300">Back to Community</Link>{loading?<p className="text-slate-400">Loading post...</p>:error?<p role="alert" className="text-red-300">{error}</p>:<PostCard post={post} onChanged={load} />}</div>;
}

export function MemberDiscovery(){
  const [q,setQ]=useState(''),[people,setPeople]=useState<any[]>([]),[error,setError]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>{discoverMembers(q).then(setPeople).catch((e)=>setError(e.message));},250);return()=>clearTimeout(timer);},[q]);
  return <div className="max-w-4xl space-y-5"><div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Discover Members</h1><p className="text-sm text-slate-400 mt-1">Private accounts show only minimal discovery information until access is accepted.</p></div><input aria-label="Search members" placeholder="Search name or username" value={q} onChange={(e)=>setQ(e.target.value)} className="input-pro w-full" />{error&&<p className="text-red-300">{error}</p>}<div className="grid sm:grid-cols-2 gap-3">{people.map((person)=><Link key={person.user_id} to={`/community/members/${person.user_id}`} className="glass rounded-2xl p-5 hover:border-lime-400/30 flex items-start gap-3"><UserAvatar name={person.name} photoUrl={person.photo_url}/><div><p className="font-semibold text-white">{person.name}</p><p className="text-xs text-cyan-300">@{person.username} · {person.is_private?'Private':'Public'}</p>{person.bio&&<p className="text-xs text-slate-400 mt-2">{person.bio}</p>}</div></Link>)}</div></div>;
}

export function CommunityProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      getMember(Number(id))
        .then(setData)
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const act = async (task: () => Promise<any>) => {
    try {
      await task();
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  if (error)
    return (
      <div role="alert" className="glass rounded-2xl p-6 text-red-300">
        {error}
      </div>
    );
  if (!data)
    return (
      <div className="glass rounded-2xl p-6 text-slate-400">
        Loading profile...
      </div>
    );
  const p = data.profile,
    r = data.relationship,
    own = p.user_id === me();
  return (
    <div className="max-w-3xl space-y-5">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={p.name}
            photoUrl={p.photo_url}
            className="w-14 h-14"
          />
          <h1 className="font-display text-2xl font-semibold text-white">
            {p.name}
          </h1>
        </div>
        <p className="text-sm text-cyan-300">
          @{p.username} · {p.is_private ? "Private account" : "Public account"}
        </p>
        <p className="text-sm text-slate-300 mt-3">
          {data.can_view
            ? p.bio
            : "Follow this member to see their profile details."}
        </p>
        <p className="text-xs text-slate-400 mt-3">
          {p.followers} followers · {p.following} following · Joined{" "}
          {formatBangladeshDate(p.created_at)}
        </p>
        {data.can_view && p.interests?.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Interests: {p.interests.join(", ")}
          </p>
        )}
        {!own && (
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              type="button"
              onClick={() =>
                act(
                  r.following
                    ? () => unfollowMember(p.user_id)
                    : () => followMember(p.user_id),
                )
              }
              className="btn-primary rounded-lg px-4 py-2 text-xs"
            >
              {r.following === "Requested"
                ? "Cancel follow request"
                : r.following === "Accepted"
                  ? "Unfollow"
                  : p.is_private
                    ? "Request follow"
                    : "Follow"}
            </button>
            <button
              type="button"
              onClick={() =>
                act(
                  r.friendship === "Accepted"
                    ? () => answerFriend(p.user_id, "unfriend")
                    : r.friendship === "Pending" &&
                        r.friendship_direction === "Incoming"
                      ? () => answerFriend(p.user_id, "accept")
                      : r.friendship === "Pending"
                        ? () => answerFriend(p.user_id, "cancel")
                        : () => friendMember(p.user_id),
                )
              }
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white"
            >
              {r.friendship === "Accepted"
                ? "Unfriend"
                : r.friendship === "Pending" &&
                    r.friendship_direction === "Incoming"
                  ? "Accept friend request"
                  : r.friendship === "Pending"
                    ? "Cancel request"
                    : "Add friend"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/messages/${p.user_id}`)}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white"
            >
              Message
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Block this member?"))
                  act(() => blockMember(p.user_id));
              }}
              className="text-xs text-red-300 px-2"
            >
              Block
            </button>
            <button
              type="button"
              onClick={() => {
                const reason = window.prompt(
                  "Why are you reporting this member?",
                );
                if (reason)
                  act(() => reportContent("Member", p.user_id, reason));
              }}
              className="text-xs text-slate-400 px-2"
            >
              Report
            </button>
          </div>
        )}
      </div>
      {data.can_view && <ProfilePosts userId={p.user_id} />}
    </div>
  );
}
function ProfilePosts({userId}:{userId:number}){const [posts,setPosts]=useState<any[]>([]);useEffect(()=>{listPosts('user',userId).then(setPosts);},[userId]);return <div className="space-y-3"><h2 className="font-display text-lg font-semibold text-white">Posts</h2>{!posts.length&&<p className="text-sm text-slate-400">No visible posts.</p>}{posts.map((post)=><PostCard key={post.post_id} post={post} onChanged={()=>listPosts('user',userId).then(setPosts)} />)}</div>}

export function CommunityRequests(){
  const [requests,setRequests]=useState<any>({follows:[],friends:[]}),[friends,setFriends]=useState<any[]>([]);
  const load=()=>{pendingRequests().then(setRequests);listFriends().then(setFriends);};useEffect(()=>{load();},[]);
  const answer=async(id:number,type:'follow'|'friend',action:'accept'|'reject')=>{try{if(type==='follow')await answerFollow(id,action);else await answerFriend(id,action);load();}catch(e:any){toast.error(e.message);}};
  return <div className="max-w-3xl space-y-5"><div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Requests & Friends</h1></div>{(['follows','friends'] as const).map((type)=><section key={type} className="glass rounded-2xl p-5"><h2 className="font-semibold text-white capitalize">{type==='follows'?'Follow requests':'Friend requests'}</h2>{!requests[type].length&&<p className="text-sm text-slate-400 mt-3">No pending requests.</p>}{requests[type].map((person:any)=><div key={person.user_id} className="flex flex-wrap items-center gap-2 border-t border-white/10 mt-3 pt-3"><Link to={`/community/members/${person.user_id}`} className="flex-1 text-sm text-white flex items-center gap-2"><UserAvatar name={person.name} photoUrl={person.photo_url}/>{person.name} <span className="text-slate-400">@{person.username}</span></Link><button type="button" onClick={()=>answer(person.user_id,type==='follows'?'follow':'friend','accept')} className="text-xs text-lime-300">Accept</button><button type="button" onClick={()=>answer(person.user_id,type==='follows'?'follow':'friend','reject')} className="text-xs text-red-300">Reject</button></div>)}</section>)}<section className="glass rounded-2xl p-5"><h2 className="font-semibold text-white">Friends</h2>{friends.map((person)=><Link key={person.user_id} to={`/community/members/${person.user_id}`} className="flex items-center gap-2 text-sm text-cyan-300 mt-2"><UserAvatar name={person.name} photoUrl={person.photo_url}/>{person.name} (@{person.username})</Link>)}</section></div>;
}

export function CommunitySettings(){
  const [form,setForm]=useState({username:'',bio:'',interests:'',photo_url:'',is_private:true,dm_policy:'Friends'}),[error,setError]=useState(''),[uploadBusy,setUploadBusy]=useState(false);
  const [blocks,setBlocks]=useState<any[]>([]);
  useEffect(()=>{getMember(me()).then(({profile})=>setForm({username:profile.username,bio:profile.bio||'',interests:(profile.interests||[]).join(', '),photo_url:profile.photo_url||'',is_private:profile.is_private,dm_policy:profile.dm_policy||'Friends'})).catch((e)=>setError(e.message));},[]);
  useEffect(()=>{blockedMembers().then(setBlocks).catch((e)=>setError(e.message));},[]);
  const save=async(event:React.FormEvent)=>{event.preventDefault();if(uploadBusy)return;try{await updateSocialProfile({...form,interests:form.interests.split(',').map((s)=>s.trim()).filter(Boolean)});const user=JSON.parse(localStorage.getItem('user')||'{}');localStorage.setItem('user',JSON.stringify({...user,photo_url:form.photo_url||null}));window.dispatchEvent(new Event('fitkit_profile_photo_changed'));toast.success('Community privacy saved');}catch(e:any){toast.error(e.message);}};
  const removePhoto=async()=>{try{await removeProfilePhoto();setForm((p)=>({...p,photo_url:''}));const user=JSON.parse(localStorage.getItem('user')||'{}');localStorage.setItem('user',JSON.stringify({...user,photo_url:null}));window.dispatchEvent(new Event('fitkit_profile_photo_changed'));toast.success('Profile picture removed');}catch(e:any){toast.error(e.message);}};
  return <div className="max-w-2xl space-y-5"><form onSubmit={save} className="glass rounded-2xl p-6 space-y-4"><h1 className="font-display text-2xl font-semibold text-white">Community Profile & Privacy</h1>{error&&<p className="text-red-300">{error}</p>}{(['username','bio','interests'] as const).map((key)=><label key={key} className="block text-xs text-slate-400 capitalize">{key.replace('_',' ')}<input value={form[key]} onChange={(e)=>setForm((p)=>({...p,[key]:e.target.value}))} className="input-pro mt-1" /></label>)}<ImageUploadField label="Profile picture (optional)" value={form.photo_url} onChange={(photo_url)=>setForm((p)=>({...p,photo_url}))} purpose="avatar" onBusyChange={setUploadBusy}/>{form.photo_url&&<button type="button" onClick={removePhoto} className="text-xs text-red-300">Remove profile picture</button>}<label className="flex gap-2 text-sm text-white"><input type="checkbox" checked={form.is_private} onChange={(e)=>setForm((p)=>({...p,is_private:e.target.checked}))} /> Private account (requests required)</label><label className="block text-xs text-slate-400">Who can message you?<select value={form.dm_policy} onChange={(e)=>setForm((p)=>({...p,dm_policy:e.target.value}))} className="input-pro mt-1"><option>Friends</option><option>Everyone</option><option>None</option></select></label><button disabled={uploadBusy} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Save privacy settings</button></form><div className="glass rounded-2xl p-6"><h2 className="font-semibold text-white">Blocked members</h2>{!blocks.length&&<p className="text-sm text-slate-400 mt-2">No blocked members.</p>}{blocks.map((person)=><div key={person.user_id} className="flex justify-between gap-2 mt-3 text-sm"><span className="text-slate-300 flex items-center gap-2"><UserAvatar name={person.name} photoUrl={person.photo_url}/>{person.name} (@{person.username})</span><button type="button" onClick={async()=>{await unblockMember(person.user_id);setBlocks((list)=>list.filter((item)=>item.user_id!==person.user_id));}} className="text-cyan-300">Unblock</button></div>)}</div></div>;
}
