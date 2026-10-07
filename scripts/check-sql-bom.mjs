import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name.endsWith(".sql")) files.push(path);
  }
  return files;
}

const files = await walk("prisma/migrations");
const bad = [];
for (const file of files) {
  const bytes = await readFile(file);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    bad.push(file);
  }
}

if (bad.length) {
  console.error("UTF-8 BOM is not allowed in Prisma SQL migrations:");
  for (const file of bad) console.error("- " + file);
  process.exit(1);
}
console.log("SQL migration BOM check: PASS (" + files.length + " files)");
