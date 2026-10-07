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

  console.log(JSON.stringify({
    status: "PASS",
    sourceTables: Number(sourceTables),
    restoredTables: Number(restoredTables),
    sourceMigrations: Number(sourceMigrations),
    restoredMigrations: Number(restoredMigrations),
  }));
} finally {
  try { run("docker", ["exec", container, "dropdb", "-U", "a1mobi", "--if-exists", restoreDb]); } catch {}
  try { run("docker", ["exec", container, "rm", "-f", dump]); } catch {}
}
