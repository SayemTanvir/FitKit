import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { conversations, getMember, messages, sendMessage } from '../services/community';
import UserAvatar from '../components/UserAvatar';

export function ConversationList(){
  const [items,setItems]=useState<any[]>([]),[error,setError]=useState('');
  useEffect(()=>{const load=()=>conversations().then(setItems).catch((e)=>setError(e.message));load();const timer=setInterval(load,10000);return()=>clearInterval(timer);},[]);
  return <div className="max-w-3xl space-y-5"><div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Messages</h1><p className="text-sm text-slate-400 mt-1">Messages are stored securely. This page checks for new messages every 10 seconds.</p></div>{error&&<p role="alert" className="text-red-300">{error}</p>}{!items.length&&<p className="text-sm text-slate-400">No conversations yet. Visit a member profile to start one.</p>}{items.map((item)=><Link key={item.other_id} to={`/messages/${item.other_id}`} className="glass rounded-2xl p-4 flex items-center gap-4"><UserAvatar name={item.name} photoUrl={item.photo_url}/><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white">{item.name} <span className="text-slate-400 font-normal">@{item.username}</span></p><p className="text-xs text-slate-400 truncate">{item.last_message}</p></div>{item.unread>0&&<span className="rounded-full bg-lime-400 text-slate-900 text-xs px-2 py-1">{item.unread}</span>}</Link>)}</div>;
}

export function Conversation(){
  const {id}=useParams(),otherId=Number(id);const [other,setOther]=useState<any>(null),[items,setItems]=useState<any[]>([]),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(()=>messages(otherId).then(setItems).catch((e)=>setError(e.message)),[otherId]);
  useEffect(()=>{getMember(otherId).then((data)=>setOther(data.profile)).catch((e)=>setError(e.message));load();const timer=setInterval(load,5000);return()=>clearInterval(timer);},[otherId,load]);
  const send=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);try{await sendMessage(otherId,text);setText('');await load();}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  const currentId=Number(JSON.parse(localStorage.getItem('user')||'{}').id);
  return <div className="max-w-3xl space-y-4"><div className="glass rounded-2xl p-5"><Link to="/messages" className="text-xs text-cyan-300">← Conversations</Link><div className="flex items-center gap-3 mt-2"><UserAvatar name={other?.name||'Conversation'} photoUrl={other?.photo_url}/><h1 className="font-display text-xl font-semibold text-white">{other?.name||'Conversation'}</h1></div></div>{error&&<p role="alert" className="text-red-300">{error}</p>}<div className="glass rounded-2xl p-5 h-[55vh] overflow-y-auto space-y-3">{!items.length&&<p className="text-sm text-slate-400">No messages yet.</p>}{items.map((item)=><div key={item.message_id} className={`max-w-[85%] rounded-xl p-3 text-sm ${item.sender_id===currentId?'ml-auto bg-lime-400/15 text-lime-50':'bg-white/10 text-slate-200'}`}><p className="whitespace-pre-wrap">{item.body}</p><p className="text-[10px] opacity-60 mt-1">{new Date(item.created_at).toLocaleString()}</p></div>)}</div><form onSubmit={send} className="glass rounded-2xl p-4 flex gap-2"><input required maxLength={4000} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a message..." className="input-pro flex-1" /><button disabled={busy} className="btn-primary rounded-xl px-5 text-sm font-semibold disabled:opacity-50">Send</button></form></div>;
}
