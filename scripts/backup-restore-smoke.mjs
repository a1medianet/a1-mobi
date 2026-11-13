import { execFileSync } from "node:child_process";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

let container = process.env.A1_MOBI_POSTGRES_CONTAINER?.trim() ?? "";
if (!container) {
  try { container = run("docker", ["compose", "-p", "a1-mobi", "ps", "-q", "postgres"]); } catch {}
}
if (!container) {
  try { container = run("docker", ["compose", "ps", "-q", "postgres"]); } catch {}
}
if (!container) throw new Error("POSTGRES_CONTAINER_NOT_RUNNING");

const stamp = Date.now();
const restoreDb = "a1mobi_restore_" + stamp;
const dump = "/tmp/a1-mobi-" + stamp + ".dump";

function psql(db, sql) {
  return run("docker", ["exec", container, "psql", "-U", "a1mobi", "-d", db, "-Atc", sql]);
}

try {
  run("docker", ["exec", container, "pg_dump", "-U", "a1mobi", "-d", "a1mobi", "-Fc", "-f", dump]);
  run("docker", ["exec", container, "createdb", "-U", "a1mobi", restoreDb]);
  run("docker", ["exec", container, "pg_restore", "-U", "a1mobi", "-d", restoreDb, "--no-owner", "--no-privileges", dump]);

  const tableSql = "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'";
  const migrationSql = 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL';
  const sourceTables = psql("a1mobi", tableSql);
  const restoredTables = psql(restoreDb, tableSql);
  const sourceMigrations = psql("a1mobi", migrationSql);
  const restoredMigrations = psql(restoreDb, migrationSql);

  if (sourceTables !== restoredTables || sourceMigrations !== restoredMigrations) {
    throw new Error("RESTORE_VERIFICATION_MISMATCH");
  }

  // Verify actual business rows, not just the migration/table structure.
  // Only compare counts and deterministic MD5 row digests; never print customer data.
  const businessTables = [
    "Tenant", "Branch", "Product", "Barcode", "StockLocation", "StockMovement",
    "StockCount", "StockCountLine", "Sale", "SaleLine", "SaleReturn",
    "SaleReturnLine", "Payment", "Invoice", "RepairOrder", "Customer",
    "CashMovement", "DebtEntry", "TopUpTransaction", "AuditEvent",
  ];
  const rows = {};
  for (const table of businessTables) {
    // Names are code-owned constants, never supplied from user input.
    const sql = `SELECT count(*)::text || ':' || md5(coalesce(string_agg(md5(row_to_json(t)::text), '' ORDER BY id), '')) FROM "${table}" t`;
    const source = psql("a1mobi", sql);
    const restored = psql(restoreDb, sql);
    if (source !== restored) throw new Error("RESTORE_BUSINESS_ROWS_MISMATCH_" + table);
    rows[table] = Number(source.split(":")[0]);
  }
  if (rows.StockMovement < 1 || rows.Sale < 1 || rows.AuditEvent < 1) {
    throw new Error("RESTORE_BUSINESS_FIXTURE_MISSING");
  }
  const ledgerQueries = {
    movementQty: 'SELECT coalesce(sum(quantity), 0)::text FROM "StockMovement"',
    saleTotal: 'SELECT coalesce(sum(total), 0)::text FROM "Sale"',
    paymentBase: 'SELECT coalesce(sum("baseAmount"), 0)::text FROM "Payment"',
    refundBase: 'SELECT coalesce(sum("refundBase"), 0)::text FROM "SaleReturn"',
  };
  for (const [name, sql] of Object.entries(ledgerQueries)) {
    if (psql("a1mobi", sql) !== psql(restoreDb, sql)) {
      throw new Error("RESTORE_LEDGER_MISMATCH_" + name);
    }
  }

  console.log(JSON.stringify({
    status: "PASS",
    sourceTables: Number(sourceTables),
    restoredTables: Number(restoredTables),
    sourceMigrations: Number(sourceMigrations),
    restoredMigrations: Number(restoredMigrations),
    matchedBusinessTables: businessTables.length,
    businessRows: rows,
    ledgerChecks: Object.keys(ledgerQueries),
  }));
} finally {
  try { run("docker", ["exec", container, "dropdb", "-U", "a1mobi", "--if-exists", restoreDb]); } catch {}
  try { run("docker", ["exec", container, "rm", "-f", dump]); } catch {}
}
