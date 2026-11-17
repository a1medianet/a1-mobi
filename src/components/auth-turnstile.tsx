"use client";
import { useEffect, useRef, useState } from "react";
type Surface="signup"|"recovery"|"login";
type TurnstileApi={render:(element:HTMLElement,config:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void};
declare global {interface Window {turnstile?:TurnstileApi}}
export function AuthTurnstile({surface,onToken}:{surface:Surface;onToken:(token:string)=>void}){
  const element=useRef<HTMLDivElement>(null);
  const widgetId=useRef<string|null>(null);
  const [config,setConfig]=useState<{enabled:boolean;sitekey:string|null}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/auth/challenge-config",{cache:"no-store",signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject(new Error("CONFIG")))
      .then((body:{sitekey:string|null;signup?:boolean;recovery?:boolean;login?:boolean})=>{
        if(!controller.signal.aborted)setConfig({enabled:body[surface]===true,sitekey:body.sitekey});
      }).catch(()=>{if(!controller.signal.aborted)setConfig({enabled:false,sitekey:null})});
    return()=>controller.abort();
  },[surface]);
  useEffect(()=>{
    if(!config?.enabled || !config.sitekey || !element.current)return;
    let disposed=false;
    const render=()=>{
      if(disposed||!window.turnstile||!element.current||widgetId.current)return;
      widgetId.current=window.turnstile.render(element.current,{
        sitekey:config.sitekey,action:surface,appearance:"interaction-only",
        callback:(token:string)=>onToken(token),
        "expired-callback":()=>onToken(""),"error-callback":()=>onToken(""),
      });
    };
    const existing=document.querySelector<HTMLScriptElement>('script[data-a1-turnstile]');
    if(existing){existing.addEventListener("load",render);render();}
    else{
      const script=document.createElement("script");
      script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.defer=true;script.dataset.a1Turnstile="1";
      script.addEventListener("load",render);document.head.append(script);
    }
    return()=>{
      disposed=true;
      if(widgetId.current&&window.turnstile)window.turnstile.remove(widgetId.current);
      widgetId.current=null;
    };
  },[config,surface,onToken]);
  if(!config?.enabled)return null;
  return <div role="group" aria-label="Cloudflare Turnstile"><div ref={element}/>
    {!config.sitekey&&<p role="alert">Security challenge is temporarily unavailable.</p>}
  </div>;
}
