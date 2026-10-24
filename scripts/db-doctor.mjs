import { pathToFileURL } from "node:url";

// Only fixed, allowlisted text leaves this module. Never print raw exceptions.
export function classify(error) {
  const code = error?.errorCode ?? error?.code;
  const known = {
    P1000: ["AUTHENTICATION_FAILED", "Verify local PostgreSQL role credentials with the local administrator."],
    P1001: ["SERVER_UNREACHABLE", "Start the local PostgreSQL service and verify its listening port."],
    P1002: ["CONNECTION_TIMEOUT", "Check local PostgreSQL readiness and local firewall rules."],
    P1003: ["DATABASE_MISSING", "Verify the intended local database exists; this doctor does not create it."],
    P1010: ["ACCESS_DENIED", "Verify the local role has CONNECT permission on the intended database."],
    P1011: ["TLS_FAILED", "Review local PostgreSQL TLS configuration and trusted certificates."],
    P1013: ["INVALID_CONFIGURATION", "Review connection syntax and percent encoding privately."],
    P2024: ["POOL_TIMEOUT", "Check local connection limits and close unused development clients."],
  };
  return known[code] ?? ["INITIALIZATION_UNCLASSIFIED", "The exception class alone does not establish a network or credential failure. Verify generated Prisma client/engine compatibility, then local service configuration privately."];
}

export function inspectTarget(value, mode) {
  if (mode === "production") return ["PRODUCTION_REFUSED", "Run only in a local development environment."];
  if (!value) return ["CONFIG_MISSING", "DATABASE_URL is absent from this process. Supply it through your approved local process environment; no .env file is read by this script."];
  try {
    const url = new URL(value);
    if (!["postgresql:", "postgres:"].includes(url.protocol)) throw new Error();
    // Literal loopback only: no DNS, proxies, sockets, or alternate host query options.
    if (!["127.0.0.1", "[::1]"].includes(url.hostname) ||
        [...url.searchParams.keys()].some(key => !["schema", "sslmode", "connection_limit", "connect_timeout", "pool_timeout", "socket_timeout"].includes(key))) {
      return ["TARGET_REFUSED", "Use a direct literal loopback PostgreSQL target with standard local connection options. No connection attempted."];
    }
    return null;
  } catch {
    return ["INVALID_CONFIGURATION", "Review PostgreSQL connection syntax privately. No connection attempted."];
  }
}

export async function main() {
  const value = process.env.DATABASE_URL;
  const rejected = inspectTarget(value, process.env.NODE_ENV);
  if (rejected) { console.log(JSON.stringify({ classification: rejected[0], action: rejected[1], queryAttempted: false })); return 1; }
  let db;
  let result;
  let queryAttempted = false;
  try {
    const url = new URL(value);
    url.searchParams.set("connect_timeout", "5");
    url.searchParams.set("socket_timeout", "5");
    const { PrismaClient } = await import("@prisma/client");
    db = new PrismaClient({ datasourceUrl: url.toString(), log: [], errorFormat: "minimal" });
    queryAttempted = true;
    await db.$queryRaw`SELECT 1`;
    result = ["CONNECTED", "Local Prisma SELECT 1 passed. Schema and migration state were not checked."];
  } catch (error) { result = classify(error); }
  finally { if (db) await db.$disconnect().catch(() => {}); }
  console.log(JSON.stringify({ classification: result[0], action: result[1], queryAttempted }));
  return result[0] === "CONNECTED" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
