import { useEffect, useState } from 'react';
import { StoredImage } from './UserAvatar';

const types=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const base=import.meta.env.VITE_API_URL||'/api';

type Purpose='avatar'|'post'|'programme'|'exercise';
function uploadImage(file:File,purpose:Purpose,progress:(value:number)=>void):Promise<string>{
  if(!types.has(file.type)||file.size<1||file.size>3*1024*1024)return Promise.reject(new Error('Choose a JPEG, PNG, WebP or GIF image under 3 MB.'));
  return new Promise((resolve,reject)=>{
    const request=new XMLHttpRequest();
    request.open('POST',`${base}/community/media/${purpose}`);
    request.setRequestHeader('Authorization',`Bearer ${localStorage.getItem('token')||''}`);
    request.setRequestHeader('Content-Type',file.type);
    request.upload.onprogress=(event)=>{if(event.lengthComputable)progress(Math.round(event.loaded/event.total*100));};
    request.onerror=()=>reject(new Error('Image upload failed. Check your connection.'));
    request.onload=()=>{
      let data:any={};try{data=JSON.parse(request.responseText);}catch{ /* non-JSON failure */ }
      if(request.status===201&&typeof data.url==='string')resolve(data.url);
      else reject(new Error(data.error||`Image upload failed (${request.status}).`));
    };
    request.send(file);
  });
}

export default function ImageUploadField({label,value,onChange,purpose,onBusyChange}:{label:string;value:string;onChange:(value:string)=>void;purpose:Purpose;onBusyChange?:(busy:boolean)=>void}){
  const [preview,setPreview]=useState<string|null>(null),[progress,setProgress]=useState<number|null>(null),[error,setError]=useState('');
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  const choose=async(file?:File)=>{
    if(!file)return;
    setError('');setProgress(0);onBusyChange?.(true);
    setPreview(URL.createObjectURL(file));
    try{onChange(await uploadImage(file,purpose,setProgress));}
    catch(e:any){setError(e.message);}
    finally{setProgress(null);setPreview(null);onBusyChange?.(false);}
  };
  return <div className="space-y-2"><label className="block text-xs text-slate-400">{label}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e)=>choose(e.target.files?.[0])} className="input-pro mt-1 w-full" /></label><label className="block text-xs text-slate-400">Or HTTPS image URL<input type="url" value={value.startsWith('/api/community/media/')?'':value} onChange={(e)=>onChange(e.target.value)} className="input-pro mt-1 w-full" /></label>{progress!==null&&<p role="status" className="text-xs text-cyan-300">Uploading image: {progress}%</p>}{error&&<p role="alert" className="text-xs text-red-300">{error}</p>}{preview?<img src={preview} alt="Selected preview" className="max-h-40 rounded-xl object-cover"/>:value?<StoredImage url={value} alt="Selected image" className="max-h-40 rounded-xl object-cover"/>:null}</div>;
}
