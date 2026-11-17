-- G5 DB-only sandbox gate. Execute only on a fresh disposable PostgreSQL database.
-- Every synthetic write is rolled back; this file does not post cash/receipts.
BEGIN;
INSERT INTO "RechargeWebhookInbox"
  ("eventId","tenantId","branchId","merchantId","rechargeOrderId","orderVersion","payloadHash","state")
VALUES ('event-lab-001','tenant-lab-A','branch-lab-A','merchant-lab-A','recharge-order-lab-1',1,repeat('a',64),'PENDING');
INSERT INTO "RechargeWebhookInbox"
  ("eventId","tenantId","branchId","merchantId","rechargeOrderId","orderVersion","payloadHash","state")
VALUES ('event-lab-001','tenant-lab-A','branch-lab-A','merchant-lab-A','recharge-order-lab-1',1,repeat('a',64),'PENDING')
ON CONFLICT ("eventId") DO NOTHING;
DO $test$
BEGIN
 IF (SELECT count(*) FROM "RechargeWebhookInbox" WHERE "eventId"='event-lab-001')<>1 THEN
  RAISE EXCEPTION 'G5 duplicate prevention failed';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='RechargeWebhookInbox' AND indexname='RechargeWebhookInbox_order_version_idx') THEN
  RAISE EXCEPTION 'G5 explicit index name missing';
 END IF;
END $test$;
DO $collision$
BEGIN
 BEGIN
  INSERT INTO "RechargeWebhookInbox"
    ("eventId","tenantId","branchId","merchantId","rechargeOrderId","orderVersion","payloadHash","state")
  VALUES ('event-lab-001','tenant-lab-B','branch-lab-B','merchant-lab-B','order-lab-B',2,repeat('b',64),'COMPLETED');
  RAISE EXCEPTION 'G5 cross-merchant collision was accepted';
 EXCEPTION
  WHEN unique_violation THEN
   RAISE NOTICE 'G5 cross-merchant duplicate correctly rejected by primary key';
 END;
END $collision$;
ROLLBACK;
DO $after$
BEGIN
 IF EXISTS (SELECT 1 FROM "RechargeWebhookInbox" WHERE "eventId"='event-lab-001') THEN
  RAISE EXCEPTION 'G5 rollback left residual test data';
 END IF;
 RAISE NOTICE 'G5 inbox sandbox SQL checks PASS';
END $after$;
