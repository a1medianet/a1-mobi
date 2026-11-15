import { Prisma } from "@prisma/client";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { db } from "@/server/db";
import {
  A1_CURRENCY_CODES,A1_CURRENCY_COUNTRIES,A1_CURRENCY_POLICY_KEY,safeCurrencyPolicy,
} from "@/modules/currency/currency-config";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const currency=z.enum(A1_CURRENCY_CODES);
const country=z.enum(A1_CURRENCY_COUNTRIES);
const payload=z.discriminatedUnion("action",[
  z.object({
    action:z.literal("policy"),
    allowedCurrencies:z.array(currency).min(2).max(13),
    preferredCurrency:currency,
    countryCode:country.nullable(),
    preferredLocale:z.enum(["ar","en"]),
    confirmed:z.literal(true),
  }).strict(),
  z.object({
    action:z.literal("rate"),
    base:currency,quote:currency,
    rate:z.string().trim().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/),
    confirmed:z.literal(true),
  }).strict(),
]);

export async function POST(request:Request){
  if(process.env.A1_MOBI_C_LIVE_01_ENABLED!=="1")
    return authJson({error:"NOT_FOUND"},404);
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({error:"INVALID_REQUEST"},400);
  try{
    const ctx=await currentStoreContext("cash.manage");
    const parsed=payload.safeParse(await readAuthJson(request,8192));
    if(!parsed.success)return authJson({error:"INVALID_CURRENCY_INPUT"},400);
    const data=parsed.data;
    const tenant=await db.tenant.findUnique({where:{id:ctx.tenantId},
      select:{baseCurrency:true,defaultLocale:true}});
    if(!tenant)return authJson({error:"TENANT_NOT_FOUND"},404);
    if(!A1_CURRENCY_CODES.includes(tenant.baseCurrency as typeof A1_CURRENCY_CODES[number]))
      return authJson({error:"UNSUPPORTED_BASE_CURRENCY"},409);
    if(data.action==="policy"){
      const normalized=safeCurrencyPolicy({
        ...data,allowedCurrencies:data.allowedCurrencies,
      },tenant.baseCurrency,tenant.defaultLocale);
      if(!normalized.allowedCurrencies.includes(data.preferredCurrency))
        return authJson({error:"UNSUPPORTED_PREFERRED_CURRENCY"},400);
      await db.$transaction(async tx=>{
        await tx.featureFlag.upsert({
          where:{tenantId_key:{tenantId:ctx.tenantId,key:A1_CURRENCY_POLICY_KEY}},
          update:{enabled:true,config:normalized},
          create:{tenantId:ctx.tenantId,key:A1_CURRENCY_POLICY_KEY,enabled:true,config:normalized},
        });
        await tx.auditEvent.create({data:{
          tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
          action:"currency.policy.changed",entityType:"CurrencyPolicy",entityId:A1_CURRENCY_POLICY_KEY,
          after:normalized,
        }});
      });
      return authJson({status:"SAVED",policy:normalized});
    }
    if(data.base===data.quote)return authJson({error:"INVALID_CURRENCY_PAIR"},400);
    const rate=new Prisma.Decimal(data.rate);
    if(!rate.isFinite()||rate.lte(0))return authJson({error:"INVALID_EXCHANGE_RATE"},400);
    const policyRow=await db.featureFlag.findUnique({
      where:{tenantId_key:{tenantId:ctx.tenantId,key:A1_CURRENCY_POLICY_KEY}},select:{config:true},
    });
    const policy=safeCurrencyPolicy(policyRow?.config,tenant.baseCurrency,tenant.defaultLocale);
    if(!policy.allowedCurrencies.includes(data.base)||!policy.allowedCurrencies.includes(data.quote))
      return authJson({error:"PAIR_NOT_ENABLED_FOR_ORGANIZATION"},403);
    const branch=await db.branch.findFirst({where:{id:ctx.branchId,tenantId:ctx.tenantId},
      select:{id:true}});
    if(!branch)return authJson({error:"BRANCH_NOT_FOUND"},404);
    const entry=await db.$transaction(async tx=>{
      const created=await tx.exchangeRate.create({data:{
        tenantId:ctx.tenantId,branchId:ctx.branchId,setById:ctx.actorId,
        baseCurrency:data.base,quoteCurrency:data.quote,rate, effectiveAt:new Date(),
      }});
      await tx.auditEvent.create({data:{
        tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
        action:"currency.manual_rate.saved",entityType:"ExchangeRate",entityId:created.id,
        after:{base:data.base,quote:data.quote,rate:data.rate,mode:"MANUAL"},
      }});
      return created;
    });
    return authJson({status:"SAVED",id:entry.id,effectiveAt:entry.effectiveAt.toISOString()},201);
  }catch(error){
    const code=error instanceof Error?error.message:"";
    if(code==="AUTH_REQUIRED")return authJson({error:code},401);
    if(code==="PERMISSION_DENIED")return authJson({error:code},403);
    return authJson({error:"CURRENCY_SAVE_FAILED"},400);
  }
}
