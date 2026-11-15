import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { readAuthJson } from "@/core/auth/request";
import { registerCustomer } from "@/modules/customers/customer-service";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const customerSchema=z.object({
  name:z.string().trim().min(2).max(140),
  phone:z.string().trim().min(7).max(32).regex(/^\+?[0-9 \-()]{7,32}$/),
  email:z.union([z.literal(""),z.email().max(240)]).optional(),
  notes:z.string().trim().max(1500).optional(),
  confirmed:z.literal(true),
}).strict();

export async function POST(request:Request){
  if(process.env.A1_MOBI_C_LIVE_01_ENABLED!=="1")
    return authJson({error:"NOT_FOUND"},404);
  if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return authJson({error:"INVALID_REQUEST"},400);
  try{
    // New customer creation is owner-restricted until a dedicated customers.create permission ships.
    const ctx=await currentStoreContext("foundation.manage");
    const parsed=customerSchema.safeParse(await readAuthJson(request,4096));
    if(!parsed.success)return authJson({error:"INVALID_CUSTOMER_DATA"},400);
    const input=parsed.data;
    const customer=await registerCustomer({
      tenantId:ctx.tenantId,branchId:ctx.branchId,actorId:ctx.actorId,
      name:input.name,phone:input.phone,email:input.email||undefined,notes:input.notes,
    });
    return authJson({id:customer.id,status:"CREATED"},201);
  }catch(error){
    const code=error instanceof Error?error.message:"";
    if(code==="AUTH_REQUIRED")return authJson({error:code},401);
    if(code==="PERMISSION_DENIED")return authJson({error:code},403);
    if(code==="A customer with this phone already exists")return authJson({error:"CUSTOMER_PHONE_EXISTS"},409);
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")
      return authJson({error:"CUSTOMER_PHONE_EXISTS"},409);
    if(/Customer (?:phone|name) (?:is|invalid)/.test(code))
      return authJson({error:"INVALID_CUSTOMER_DATA"},400);
    return authJson({error:"CUSTOMER_REGISTRATION_FAILED"},400);
  }
}
