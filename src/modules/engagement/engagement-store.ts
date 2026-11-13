import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";

export type EngagementRecord={
  id:string;branchId:string;type:"FOLLOWUP"|"CAMPAIGN";
  title:string;detail:string;customerId?:string;channel?:"INTERNAL"|"EMAIL"|"WHATSAPP"|"SMS";
  dueAt?:string;status:"OPEN"|"DONE"|"DRAFT";createdAt:string;
};
const KEY="mobi.engagement.records.v1";
function readRecords(config:unknown):EngagementRecord[]{
  if(!config||typeof config!=="object"||Array.isArray(config))return [];
  const r=(config as Record<string,unknown>).records;
  if(!Array.isArray(r))return [];
  return r.filter((item):item is EngagementRecord=>Boolean(item&&typeof item==="object"&&
    typeof item.id==="string"&&typeof item.branchId==="string"&&
    (item.type==="FOLLOWUP"||item.type==="CAMPAIGN")&&
    typeof item.title==="string"&&typeof item.detail==="string"&&
    typeof item.createdAt==="string"&&
    (item.status==="OPEN"||item.status==="DONE"||item.status==="DRAFT"))).slice(0,200);
}
export async function listEngagement(scope:{tenantId:string;branchId:string;type:EngagementRecord["type"]}){
  const row=await db.featureFlag.findUnique({where:{tenantId_key:{tenantId:scope.tenantId,key:KEY}},select:{config:true}});
  return readRecords(row?.config).filter(r=>r.branchId===scope.branchId&&r.type===scope.type)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function changeEngagement(input:{
  tenantId:string;branchId:string;actorId:string;
  action:"CREATE"|"COMPLETE";type:EngagementRecord["type"];
  id?:string;title?:string;detail?:string;customerId?:string;channel?:EngagementRecord["channel"];dueAt?:string;
}){
  return db.$transaction(async tx=>{
    await tx.featureFlag.upsert({
      where:{tenantId_key:{tenantId:input.tenantId,key:KEY}},
      create:{tenantId:input.tenantId,key:KEY,enabled:true,config:{records:[]}},
      update:{enabled:true},
    });
    await tx.$queryRaw`SELECT "id" FROM "FeatureFlag" WHERE "tenantId"=${input.tenantId} AND "key"=${KEY} FOR UPDATE`;
    const row=await tx.featureFlag.findUniqueOrThrow({where:{tenantId_key:{tenantId:input.tenantId,key:KEY}}});
    const records=readRecords(row.config);
    let result:EngagementRecord;
    if(input.action==="COMPLETE"){
      const entry=records.find(x=>x.id===input.id&&x.branchId===input.branchId&&x.type==="FOLLOWUP");
      if(!entry)throw Error("FOLLOWUP_NOT_FOUND");
      entry.status="DONE";result=entry;
    }else{
      const active=records.filter(x=>x.branchId===input.branchId&&x.type===input.type);
      if(active.length>=50||records.length>=200)throw Error("ENGAGEMENT_LIMIT");
      result={id:crypto.randomUUID(),branchId:input.branchId,type:input.type,
        title:input.title!,detail:input.detail!,status:input.type==="CAMPAIGN"?"DRAFT":"OPEN",
        createdAt:new Date().toISOString(),
        ...(input.customerId?{customerId:input.customerId}:{}),
        ...(input.channel?{channel:input.channel}:{}),
        ...(input.dueAt?{dueAt:input.dueAt}:{})};
      records.unshift(result);
    }
    await tx.featureFlag.update({where:{id:row.id},data:{config:{records} as unknown as Prisma.InputJsonValue}});
    await tx.auditEvent.create({data:{tenantId:input.tenantId,branchId:input.branchId,
      actorId:input.actorId,action:input.action==="CREATE"?"engagement.created":"engagement.completed",
      entityType:input.type,entityId:result.id,
      after:{type:result.type,status:result.status,channel:result.channel??null}}});
    return result;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
