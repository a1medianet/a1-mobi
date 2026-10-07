"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const KEY="a1.mobi.installation.v1";

function installationId(){
  const current=window.localStorage.getItem(KEY);
  if(current)return current;
  const created=crypto.randomUUID();
  window.localStorage.setItem(KEY,created);
  return created;
}

export function PulseHeartbeat(){
  const pathname=usePathname();
  useEffect(()=>{
    const controller=new AbortController();
    const send=async()=>{
      try{
        const session=await fetch("/api/auth/session",{cache:"no-store",signal:controller.signal});
        if(!session.ok)return;
        await fetch("/api/pulse/heartbeat",{
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({installationId:installationId(),route:pathname}),
          signal:controller.signal,
        });
      }catch{/* Telemetry must never break product use. */}
    };
    void send();
    return()=>controller.abort();
  },[pathname]);
  return null;
}
