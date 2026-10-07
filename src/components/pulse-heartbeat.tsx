"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getInstallationId } from "@/core/client-installation";

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
          body:JSON.stringify({installationId:getInstallationId(),route:pathname}),
          signal:controller.signal,
        });
      }catch{/* Telemetry must never break product use. */}
    };
    void send();
    return()=>controller.abort();
  },[pathname]);
  return null;
}
