"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { getInstallationId } from "@/core/client-installation";

export default function OperationalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const params=useParams<{locale?:string}>();
  const pathname=usePathname();
  const locale=params?.locale==="en"?"en":"ar";
  const ar=locale==="ar";

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/pulse/error",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({digest:error.digest||error.name||"unknown",route:pathname,installationId:getInstallationId()}),
      signal:controller.signal,
    }).catch(()=>undefined);
    return()=>controller.abort();
  },[error,pathname]);

  return <main className="module-page error-surface">
    <section>
      <span className="module-kicker">A1 MOBI · RECOVERY</span>
      <h1>{ar?"تعذر فتح هذه الشاشة":"This screen could not be opened"}</h1>
      <p>{ar?"سجّل النظام معرف الخطأ ويمكنك إعادة المحاولة أو العودة إلى لوحة التحكم.":"The system recorded an error identifier. Retry or return to the dashboard."}</p>
      <div className="error-actions">
        <button className="primary" onClick={reset}>{ar?"إعادة المحاولة":"Try again"}</button>
        <Link className="soft-btn" href={"/"+locale}>{ar?"لوحة التحكم":"Dashboard"}</Link>
        <Link className="soft-btn" href={"/product/"+locale+"/help#troubleshooting"}>{ar?"حل المشاكل":"Troubleshooting"}</Link>
      </div>
    </section>
  </main>;
}
