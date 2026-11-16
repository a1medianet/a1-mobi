"use client";
import { useEffect, useRef, useState } from "react";

// The widget is distributed from A1 Support. Host supplies a session-backed,
// same-origin API; service credentials must never be sent to the browser.
export function SupportCenterClient() {
 const container=useRef<HTMLDivElement>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const node=container.current;
  if(!node)return;
  let cancelled=false;
  const script=document.createElement("script");
  script.type="module";
  script.src="/a1-addons/support-center.mjs";
  script.onload=()=>{
   if(cancelled||!node)return;
   void (async()=>{
    try{
     const response=await fetch("/api/a1-support/session",{credentials:"same-origin",cache:"no-store",redirect:"error"});
     if(!response.ok)throw Error("SUPPORT_SESSION_UNAVAILABLE");
     const session=await response.json() as {csrfToken?:string};
     if(typeof session.csrfToken!=="string"||!session.csrfToken)throw Error("SUPPORT_CSRF_UNAVAILABLE");
     if(cancelled||!node)return;
     const widget=document.createElement("a1-support-center") as HTMLElement&{csrfToken?:string};
     widget.setAttribute("api-base","/api/a1-support/");
     widget.csrfToken=session.csrfToken;
     widget.setAttribute("enabled","true");
     node.replaceChildren(widget);
    }catch{if(!cancelled)setFailed(true);}
   })();
  };
  script.onerror=()=>{if(!cancelled)setFailed(true);};
  document.head.append(script);
  return ()=>{cancelled=true;script.remove();node.replaceChildren();};
 },[]);
 return <section aria-label="المساعدة والدعم">
  {failed?<p role="alert">تعذّر تحميل مركز الدعم.</p>:<div ref={container}><p>جارٍ تحميل مركز الدعم…</p></div>}
 </section>;
}
