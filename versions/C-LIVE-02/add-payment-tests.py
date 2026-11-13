from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\tests\c-live-02-route-db.test.ts")
s=p.read_text(encoding="utf8")
old='permissions:new Set(["repair.manage"])'
assert s.count(old)==2
s=s.replace(old,'permissions:new Set(["repair.manage","cash.manage"])')
mark=' it("rejects tenant crossover, invalid transitions and duplicated request",async()=>{'
assert s.count(mark)==1
add="""
 it("does not deliver unpaid repair or take cash without open till; records payment exactly once",async()=>{
  active=a;
  const deliverPayload={action:"deliver",repairId,confirmedPickup:true,warrantyDays:30,
    warrantyTerms:"Parts and labor from pickup date"};
  expect((await post(deliverPayload)).status).toBe(409);
  const key=randomUUID();
  const first={action:"pay",repairId,amount:50,idempotencyKey:key};
  const noTill=await post(first);
  expect(noTill.status).toBe(409);
  expect((await noTill.json()).error).toBe("OPEN_CASH_SESSION_REQUIRED");
  const opened=await post({action:"openCash",openingUsd:0,openingLbp:0,
    openingExchangeRate:90000});
  expect(opened.status).toBe(201);
  const openId=(await opened.json()).cashSessionId;
  expect((await (await route.GET()).json()).cashOpen).toBe(true);
  const paid=await post(first);
  expect(paid.status).toBe(201);
  const firstResult=await paid.json();
  expect(firstResult.replayed).toBe(false);
  const replay=await post(first);
  expect(replay.status).toBe(200);
  expect((await replay.json()).paymentId).toBe(firstResult.paymentId);
  const reuse=await post({...first,amount:40});
  expect(reuse.status).toBe(409);
  const afterPartial=await db.repairOrder.findUniqueOrThrow({where:{id:repairId}});
  expect(Number(afterPartial.paidTotal)).toBe(50);
  expect(Number(afterPartial.balanceDue)).toBe(70);
  expect((await post(deliverPayload)).status).toBe(409);
  const overpay=await post({action:"pay",repairId,amount:71,idempotencyKey:randomUUID()});
  expect(overpay.status).toBe(409);
  const final=await post({action:"pay",repairId,amount:70,idempotencyKey:randomUUID()});
  expect(final.status).toBe(201);
  const state=await db.repairOrder.findUniqueOrThrow({where:{id:repairId}});
  expect(Number(state.balanceDue)).toBe(0);
  expect(Number(state.paidTotal)).toBe(120);
  const rows=await db.cashMovement.findMany({where:{tenantId:a.tenantId,
    cashSessionId:openId,type:"REPAIR",sourceType:"Payment"}});
  expect(rows).toHaveLength(2);
  expect(rows.reduce((acc,row)=>acc+Number(row.amount),0)).toBe(120);
  expect((await db.payment.count({where:{repairOrderId:repairId,status:"POSTED"}}))).toBe(2);
  active=b;
  expect((await post({action:"pay",repairId,amount:1,idempotencyKey:randomUUID()})).status).toBe(404);
  expect((await post(deliverPayload)).status).toBe(404);
  active={...a,permissions:new Set(["repair.manage"])};
  expect((await post({action:"pay",repairId,amount:1,idempotencyKey:randomUUID()})).status).toBe(403);
  active=a;
  const delivered=await post(deliverPayload);
  expect(delivered.status).toBe(201);
  const delivery=await delivered.json();
  expect(delivery.warrantyId).toBeTruthy();
  const deliveredAgain=await post(deliverPayload);
  expect(deliveredAgain.status).toBe(200);
  expect((await deliveredAgain.json()).warrantyId).toBe(delivery.warrantyId);
  const finalState=await (await route.GET()).json();
  const item=finalState.orders.find((o:{id:string})=>o.id===repairId);
  expect(item.status).toBe("DELIVERED");
  expect(item.warranty.status).toBe("ACTIVE");
  expect(item.balanceDue).toBe(0);
  expect((await db.warranty.count({where:{tenantId:a.tenantId,repairOrderId:repairId}}))).toBe(1);
  expect((await db.repairStatusEvent.count({where:{
    repairOrderId:repairId,toStatus:"DELIVERED"}}))).toBe(1);
 },90000);
"""
s=s.replace(mark,add+"\n"+mark,1)
p.write_text(s,encoding="utf8",newline="\n")
print("PAYMENT DELIVERY NEGATIVE REPLAY REGRESSION ADDED")
