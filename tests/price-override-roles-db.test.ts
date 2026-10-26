import { randomUUID } from "node:crypto";
import { PaymentMethod, ProductType, StockMovementType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { registerProduct } from "@/modules/inventory/inventory-service";
import { checkoutSale } from "@/modules/sell/sell-service";

const uat = (() => {
  try { const url = new URL(process.env.DATABASE_URL ?? ""); 
    return url.hostname === "127.0.0.1" && url.port === "5441" && url.pathname === "/mobi_roles_uat";
  } catch { return false; }
})();
(uat ? describe : describe.skip)("5/7 pricing roles and minimum-price PostgreSQL acceptance", () => {
  it("rejects cashier/foreign-role overrides, requires manager reason, then audits permitted discount", async () => {
    const mark = randomUUID().slice(0, 12);
    const tenant = await db.tenant.create({data:{slug:"discount-"+mark,name:"Discount role UAT"}});
    const branch = await db.branch.create({data:{tenantId:tenant.id,code:"MAIN",name:"QA"}});
    const otherTenant = await db.tenant.create({data:{slug:"outside-"+mark,name:"Foreign tenant"}});
    const user = (name:string, tenantId=tenant.id) => db.user.create({data:{
      tenantId,branchId:tenantId === tenant.id ? branch.id : undefined,
      email:name+"-"+mark+"@example.test",displayName:name,passwordHash:"fixture-only",
    }});
    const [cashier, manager, foreign] = await Promise.all([
      user("cashier"),user("manager"),user("foreign",otherTenant.id),
    ]);
    const permission = await db.permission.upsert({where:{code:"sell.price.override"},update:{},
      create:{code:"sell.price.override",description:"Override sale price floor"}});
    const role = await db.role.create({data:{tenantId:tenant.id,code:"PRICE_APPROVER",name:"Price approver"}});
    const foreignRole = await db.role.create({data:{tenantId:otherTenant.id,code:"PRICE_APPROVER",name:"Foreign approver"}});
    await db.rolePermission.createMany({data:[
      {roleId:role.id,permissionId:permission.id},{roleId:foreignRole.id,permissionId:permission.id},
    ]});
    await db.userRole.createMany({data:[
      {userId:manager.id,roleId:role.id},{userId:foreign.id,roleId:foreignRole.id},
    ]});
    const category = await db.category.create({data:{tenantId:tenant.id,code:"ACCESSORY",nameAr:"إكسسوارات",nameEn:"Accessories"}});
    const item = await registerProduct({tenantId:tenant.id,actorId:manager.id,categoryId:category.id,
      sku:"DISCOUNT-"+mark,nameAr:"غطاء",nameEn:"Case",type:ProductType.ACCESSORY,isSerialized:false,
      barcodes:["DISC"+mark]});
    await db.product.update({where:{id:item.id},data:{costAmount:10,basePrice:100,minimumPrice:90}});
    const location = await db.stockLocation.create({data:{tenantId:tenant.id,branchId:branch.id,code:"SHOP",name:"Shop"}});
    await db.stockMovement.create({data:{
      tenantId:tenant.id,branchId:branch.id,productId:item.id,toLocationId:location.id,
      type:StockMovementType.PURCHASE_RECEIPT,quantity:5,unitCost:10,
      referenceType:"PilotUAT",referenceId:mark,idempotencyKey:"receive-"+mark,
    }});
    const sale = (actorId:string, tag:string, price:number, reason?:string) => checkoutSale({
      tenantId:tenant.id,branchId:branch.id,actorId,number:"S-"+tag+"-"+mark,
      invoiceNumber:"INV-"+tag+"-"+mark,idempotencyKey:"sale-"+tag+"-"+mark,
      lines:[{productId:item.id,stockLocationId:location.id,quantity:1,finalPrice:price,overrideReason:reason}],
      payments:[{method:PaymentMethod.CASH,currency:"USD",amount:price,exchangeRate:1}],
    });
    await expect(sale(cashier.id,"cashier",80,"unapproved discount")).rejects.toThrow(/requires permission/);
    await expect(sale(foreign.id,"foreign",80,"foreign permissions")).rejects.toThrow(/Cross-tenant sale/);
    await expect(sale(manager.id,"no-reason",80)).rejects.toThrow(/actor and reason/);
    expect(await db.sale.count({where:{tenantId:tenant.id}})).toBe(0);
    const approved = await sale(manager.id,"approved",80,"Customer loyalty — owner approved");
    expect(Number(approved.total)).toBe(80);
    expect(approved.lines[0].priceOverrideActorId).toBe(manager.id);
    expect(approved.lines[0].priceOverrideReason).toBe("Customer loyalty — owner approved");
    expect(approved.invoice?.number).toBe("INV-approved-"+mark);
    expect(await db.auditEvent.count({where:{tenantId:tenant.id,action:"sale.checkout",entityId:approved.id}})).toBe(1);
    const normal = await sale(cashier.id,"normal",95);
    expect(normal.lines[0].priceOverrideActorId).toBeNull();
    expect(await db.sale.count({where:{tenantId:tenant.id}})).toBe(2);
    expect(await db.stockMovement.count({where:{tenantId:tenant.id,productId:item.id,type:StockMovementType.SALE}})).toBe(2);
  },90_000);
});
