import { useEffect, useState } from 'react';

const apiBase=(import.meta as ImportMeta & {env?:{VITE_API_URL?:string}}).env?.VITE_API_URL||'/api';
const isStored=(url:string)=>/^\/api\/community\/media\/\d+$/.test(url);

function useImageSource(url?:string|null){
  const [source,setSource]=useState<string|null>(null);
  useEffect(()=>{
    if(!url){setSource(null);return;}
    if(!isStored(url)){setSource(url);return;}
    setSource(null);
    let cancelled=false,objectUrl:string|null=null;
    const origin=apiBase.replace(/\/api\/?$/,'');
    fetch(`${origin}${url}`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')||''}`}})
      .then((response)=>{if(!response.ok)throw new Error('Image unavailable');return response.blob();})
      .then((blob)=>{if(!cancelled){objectUrl=URL.createObjectURL(blob);setSource(objectUrl);}})
      .catch(()=>{if(!cancelled)setSource(null);});
    return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[url]);
  return source;
}

export function StoredImage({url,alt,className}:{url:string;alt:string;className?:string}){
  const source=useImageSource(url);
  return source?<img src={source} alt={alt} loading="lazy" className={className}/>:null;
}

export default function UserAvatar({name,photoUrl,className='w-8 h-8',gradient='from-lime-400 to-emerald-500',textClass='text-[11px]'}:{name:string;photoUrl?:string|null;className?:string;gradient?:string;textClass?:string}){
  const source=useImageSource(photoUrl);
  const initials=name.trim().split(/\s+/).map((part)=>part[0]).join('').toUpperCase().slice(0,2)||'FK';
  return <span aria-label={`${name} avatar`} className={`rounded-full bg-gradient-to-br ${gradient} inline-flex shrink-0 items-center justify-center overflow-hidden ${textClass} font-bold text-slate-900 ${className}`}>{source?<img src={source} alt="" loading="lazy" className="w-full h-full object-cover"/>:initials}</span>;
}
