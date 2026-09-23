const base=import.meta.env.VITE_API_URL||'/api';
async function request<T>(path:string,method='GET',body?:unknown):Promise<T>{
  let response:Response;
  try{response=await fetch(`${base}/community${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')||''}`},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw new Error('Cannot reach the FitKit API.');}
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status}).`);return data as T;
}
export const discoverMembers=(q='')=>request<any[]>(`/members?q=${encodeURIComponent(q)}`);
export const getMember=(id:number)=>request<any>(`/members/${id}`);
export const updateSocialProfile=(data:unknown)=>request<any>('/me','PUT',data);
export const removeProfilePhoto=()=>request<any>('/me/photo','DELETE');
export const followMember=(id:number)=>request<any>(`/members/${id}/follow`,'POST');
export const unfollowMember=(id:number)=>request<any>(`/members/${id}/follow`,'DELETE');
export const answerFollow=(id:number,action:'accept'|'reject')=>request<any>(`/members/${id}/follow`,'PATCH',{action});
export const friendMember=(id:number)=>request<any>(`/members/${id}/friend`,'POST');
export const answerFriend=(id:number,action:'accept'|'reject'|'cancel'|'unfriend')=>request<any>(`/members/${id}/friend`,'PATCH',{action});
export const pendingRequests=()=>request<any>('/requests');
export const listFriends=()=>request<any[]>('/friends');
export const blockMember=(id:number)=>request<any>(`/members/${id}/block`,'POST');
export const unblockMember=(id:number)=>request<any>(`/members/${id}/block`,'DELETE');
export const blockedMembers=()=>request<any[]>('/blocks');
export const listPosts=(scope:'discover'|'following'|'mine'|'user'='discover',userId?:number,before?:number)=>request<any[]>(`/posts?scope=${scope}${userId?`&user=${userId}`:''}${before?`&before=${before}`:''}`);
export const getPost=(id:number)=>request<any>(`/posts/${id}`);
export const createPost=(body:string,visibility:string,image_url?:string)=>request<any>('/posts','POST',{body,visibility,image_url});
export const editPost=(id:number,body:string,visibility:string)=>request<any>(`/posts/${id}`,'PUT',{body,visibility});
export const deletePost=(id:number)=>request<any>(`/posts/${id}`,'DELETE');
export const togglePostLike=(id:number)=>request<any>(`/posts/${id}/like`,'POST');
export const reactToPost=(id:number,reaction_type:'Fire'|'Flex'|'Clap')=>request<any>(`/posts/${id}/reaction`,'POST',{reaction_type});
export const listComments=(id:number)=>request<any[]>(`/posts/${id}/comments`);
export const addComment=(id:number,body:string)=>request<any>(`/posts/${id}/comments`,'POST',{body});
export const deleteComment=(id:number)=>request<any>(`/comments/${id}`,'DELETE');
export const conversations=()=>request<any[]>('/conversations');
export const messages=(id:number,before?:number)=>request<any[]>(`/messages/${id}${before?`?before=${before}`:''}`);
export const sendMessage=(id:number,body:string)=>request<any>(`/messages/${id}`,'POST',{body});
export const notifications=()=>request<any[]>('/notifications');
export const readNotification=(id:number)=>request<any>(`/notifications/${id}`,'PATCH');
export const reportContent=(target_type:string,target_id:number,reason:string)=>request<any>('/reports','POST',{target_type,target_id,reason});
export const moderationReports=()=>request<any[]>('/moderation/reports');
export const resolveReport=(id:number,status:'Resolved'|'Dismissed',note:string,remove=false)=>request<any>(`/moderation/reports/${id}`,'PATCH',{status,note,remove});
export const suspendMember=(id:number,suspend:boolean,note:string)=>request<any>(`/moderation/members/${id}/suspension`,'PATCH',{suspend,note});
