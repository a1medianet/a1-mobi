import { appVersionInfo } from "@/core/version";

export type AssistContext={
  question:string;
  locale:"ar"|"en";
  route:string;
  tenantId:string;
  branchId:string;
  permissions:string[];
};

export async function askA1Assist(context:AssistContext){
  const endpoint=process.env.A1_ASSIST_ENDPOINT;
  const token=process.env.A1_ASSIST_SERVICE_TOKEN;
  if(!endpoint||!token)return {available:false as const,reason:"not_configured" as const};

  try{
    const response=await fetch(endpoint,{
      method:"POST",
      headers:{authorization:"Bearer "+token,"content-type":"application/json"},
      body:JSON.stringify({
        product:"a1-mobi",
        release:appVersionInfo(),
        locale:context.locale,
        route:context.route,
        tenantId:context.tenantId,
        branchId:context.branchId,
        permissions:context.permissions,
        question:context.question,
        policy:{actions:"deny_unless_explicitly_allowed",versionAware:true},
      }),
      signal:AbortSignal.timeout(10_000),
      cache:"no-store",
    });
    const body=await response.json().catch(()=>null) as {answer?:unknown}|null;
    if(!response.ok||typeof body?.answer!=="string"||!body.answer.trim()){
      return {available:false as const,reason:"upstream_error" as const};
    }
    return {available:true as const,answer:body.answer.trim()};
  }catch{
    return {available:false as const,reason:"upstream_error" as const};
  }
}

export function guideFallback(question:string,locale:"ar"|"en"){
  const q=question.toLowerCase();
  const ar=locale==="ar";
  const entries=[
    {keys:["login","دخول","password","كلمة","mfa","مصادقة"],topic:ar?"تسجيل الدخول وأمان الحساب":"Sign-in & account security",anchor:"security"},
    {keys:["branch","فرع","فروع"],topic:ar?"الفروع وحدود الخطة":"Branches & plan limits",anchor:"billing"},
    {keys:["repair","صيانة","تصليح"],topic:ar?"رحلة الصيانة":"Repair journey",anchor:"repair"},
    {keys:["stock","inventory","مخزون","جرد"],topic:ar?"المخزون والأجهزة":"Inventory & devices",anchor:"inventory"},
    {keys:["sell","sale","بيع","pos","باركود","barcode"],topic:ar?"نقطة البيع":"Point of sale",anchor:"sell"},
    {keys:["role","permission","صلاح","فريق","team"],topic:ar?"الفريق والصلاحيات":"Team & permissions",anchor:"roles"},
    {keys:["billing","plan","اشتراك","خطة","trial"],topic:ar?"الخطط والاشتراك":"Plans & subscription",anchor:"billing"},
  ];
  const match=entries.find(entry=>entry.keys.some(key=>q.includes(key)))??entries[0];
  return {
    answer:ar
      ? "لم يتم توصيل A1 Assist بهذه البيئة بعد. وجدت أقرب قسم في دليل Mobi: "+match.topic+"."
      : "A1 Assist is not connected in this environment yet. The closest Mobi guide section is: "+match.topic+".",
    anchor:match.anchor,
  };
}
