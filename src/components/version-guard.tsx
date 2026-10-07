"use client";

import { useEffect, useState } from "react";

type VersionInfo={
  version:string;build:string;channel:string;latest:string;minimum:string;
  updateState:"current"|"recommended"|"required";
};

export function VersionGuard({locale}:{locale:"ar"|"en"}){
  const ar=locale==="ar";
  const [info,setInfo]=useState<VersionInfo|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/version",{cache:"no-store",signal:controller.signal})
      .then(async response=>response.ok?response.json():null)
      .then(setInfo)
      .catch(()=>undefined);
    return()=>controller.abort();
  },[]);
  if(!info||info.updateState==="current")return null;
  const required=info.updateState==="required";
  return <div className={"version-banner "+(required?"required":"recommended")} role={required?"alert":"status"}>
    <div><b>{required?(ar?"تحديث مطلوب":"Update required"):(ar?"تحديث متاح":"Update available")}</b><span>{ar?"النسخة":"Version"} {info.version} · {ar?"الأحدث":"latest"} {info.latest}</span></div>
    <button type="button" onClick={()=>window.location.reload()}>{ar?"تحديث الآن":"Refresh now"}</button>
  </div>;
}
