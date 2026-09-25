import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { demoteAdmin, fetchRoleAssignments, promoteMember, type RoleAssignment } from '../services/api';

const API_URL=import.meta.env.VITE_API_URL||'/api';
const authHeaders=()=>({Authorization:`Bearer ${localStorage.getItem('token')||''}`});
type AdminStats={can_manage_admins:boolean;[key:string]:number|boolean};

export default function AdminOverview(){
  const [stats,setStats]=useState<AdminStats|null>(null);
  const [error,setError]=useState('');
  const labels:Record<string,string>={members:'Registered members',admins:'Active admins',exercises:'Active exercises',programmes:'Programmes',published_versions:'Published versions',enrollments:'Enrollments',completed_sessions:'Completed sessions',posts:'Community posts',messages:'Messages',open_reports:'Open reports'};

  useEffect(()=>{
    fetch(`${API_URL}/admin/overview`,{headers:authHeaders()})
      .then(async(response)=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load admin overview');setStats(data);})
      .catch((caught)=>setError(caught.message));
  },[]);

  return <div className="space-y-6">
    <div className="glass rounded-2xl p-6"><h1 className="font-display text-2xl font-semibold text-white">Admin Overview</h1><p className="text-sm text-slate-400 mt-1">Current counts from the FitKit database.</p></div>
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    {!stats&&!error&&<p className="text-slate-400">Loading overview...</p>}
    {stats?.can_manage_admins&&<AdminAccessManager/>}
    {stats&&<div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Object.entries(labels).map(([key,label])=><div key={key} className="glass rounded-2xl p-5"><p className="text-xs text-slate-400">{label}</p><p className="font-display text-3xl font-semibold text-white mt-2">{Number(stats[key]||0).toLocaleString()}</p></div>)}</div>}
    <div className="flex flex-wrap gap-3 text-sm"><Link to="/programmes" className="text-cyan-300">Manage programmes →</Link><Link to="/exercise-library" className="text-cyan-300">Exercise library →</Link><Link to="/moderation" className="text-cyan-300">Moderation queue →</Link></div>
  </div>;
}

function AdminAccessManager(){
  const [accounts,setAccounts]=useState<RoleAssignment[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState('');
  const load=()=>fetchRoleAssignments().then(setAccounts).catch((caught)=>setError(caught.message)).finally(()=>setLoading(false));
  useEffect(()=>{void load();},[]);
  const admins=accounts.filter((account)=>account.role==='Admin');
  const members=accounts.filter((account)=>account.role==='Member');

  const promote=async(account:RoleAssignment)=>{
    if(!window.confirm(`Make ${account.name} an admin? They will receive normal admin tools but cannot add or remove admins.`))return;
    setBusy(account.user_id);
    try{const result=await promoteMember(account.user_id);toast.success(result.message);await load();}catch(caught){toast.error(caught instanceof Error?caught.message:'Could not add admin.');}finally{setBusy(null);}
  };
  const demote=async(account:RoleAssignment)=>{
    if(!window.confirm(`Remove admin access from ${account.name}? They will become a member again.`))return;
    setBusy(account.user_id);
    try{const result=await demoteAdmin(account.user_id);toast.success(result.message);await load();}catch(caught){toast.error(caught instanceof Error?caught.message:'Could not remove admin.');}finally{setBusy(null);}
  };

  return <section className="glass rounded-2xl p-6 space-y-6">
    <div><h2 className="font-display text-xl font-semibold text-white">Admin access</h2><p className="text-sm text-slate-400 mt-1">Only your main admin account can promote members or return admins to member access.</p></div>
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    {loading?<p className="text-sm text-slate-400">Loading accounts...</p>:<>
      <AccountList title="Admins" empty="No admins found." accounts={admins} renderAction={(account)=>account.can_manage_admins?<span className="text-xs font-semibold text-lime-300">Main admin</span>:<button type="button" disabled={busy===account.user_id} onClick={()=>demote(account)} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50">Make member</button>}/>
      <AccountList title="Members" empty="No members available." accounts={members} renderAction={(account)=><button type="button" disabled={busy===account.user_id||Boolean(account.suspended_at)} onClick={()=>promote(account)} className="rounded-lg border border-cyan-400/20 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50">{account.suspended_at?'Suspended':'Make admin'}</button>}/>
    </>}
  </section>;
}

function AccountList({title,empty,accounts,renderAction}:{title:string;empty:string;accounts:RoleAssignment[];renderAction:(account:RoleAssignment)=>ReactNode}){
  return <div><h3 className="text-sm font-semibold text-slate-200">{title} <span className="text-slate-500">({accounts.length})</span></h3><div className="mt-2 divide-y divide-white/10 rounded-xl border border-white/10">{accounts.length?accounts.map((account)=><div key={account.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="text-sm font-medium text-white truncate">{account.name}</p><p className="text-xs text-slate-500 truncate">{account.email}</p></div>{renderAction(account)}</div>):<p className="px-4 py-3 text-sm text-slate-500">{empty}</p>}</div></div>;
}
