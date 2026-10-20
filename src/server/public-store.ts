import { db } from "@/server/db";
export async function publicStoreCatalog(slug:string){
 if(process.env.A1_MOBI_PUBLIC_ORDERS_ENABLED!=="1"||!/^[a-f0-9]{32}$/.test(slug))return null;
 const branch=(await db.$queryRawUnsafe<Array<{id:string;tenantId:string;name:string}>>(
  'SELECT "id","tenantId","name" FROM "Branch" WHERE "publicStoreSlug" = $1 AND "acceptingStoreOrders" = true LIMIT 1',slug
 ))[0];
 if(!branch)return null;
 const devices=await db.serializedDevice.groupBy({
  by:["productId"],where:{tenantId:branch.tenantId,status:"IN_STOCK",stockLocation:{branchId:branch.id}},
  _count:{_all:true}
 });
 const counts=new Map(devices.map(row=>[row.productId,row._count._all]));
 const ids=[...counts.keys()];
 const products=ids.length?await db.product.findMany({
  where:{id:{in:ids},tenantId:branch.tenantId,isActive:true,isSerialized:true},
  orderBy:{nameEn:"asc"},take:80,
  select:{id:true,sku:true,nameAr:true,nameEn:true,basePrice:true}
 }):[];
 return {...branch,slug,products:products.map(p=>({
  id:p.id,sku:p.sku,nameAr:p.nameAr,nameEn:p.nameEn,
  price:Number(p.basePrice),available:counts.get(p.id)??0
 })).filter(p=>p.available>0&&p.price>0)};
}
