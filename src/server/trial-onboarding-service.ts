import { bootstrapStore, rollbackProvisionedStore } from "./bootstrap-service";
import { startMobiTrial } from "./billing-client";

export async function onboardMobiTrial(input:{
  tenantSlug:string;
  tenantName:string;
  branchCode:string;
  branchName:string;
  ownerEmail:string;
  ownerDisplayName:string;
  ownerPassword:string;
  locale:"ar"|"en";
}){
  const provisioned=await bootstrapStore(input);
  try{
    const entitlement=await startMobiTrial(provisioned.billingTenantKey);
    return {...provisioned,entitlement};
  }catch(error){
    await rollbackProvisionedStore(provisioned.tenantId);
    throw error;
  }
}
