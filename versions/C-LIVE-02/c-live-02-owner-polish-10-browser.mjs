// Visual regression wrapper: reuse CANONICAL-09 browser suite without modifying it.
// All files and Chrome profiles remain inside C:\\A1Hub\\a1-mobi\\versions\\C-LIVE-02.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const dir=resolve("versions/C-LIVE-02");
const source=readFileSync(resolve(dir,"c-live-02-canonical-09-browser.mjs"),"utf8");
let runner=source.replaceAll("c-live-02-canonical-09-","c-live-02-owner-polish-10-")
 .replaceAll("chrome-uat-canonical-09","chrome-uat-owner-polish-10")
 .replaceAll("9238","9240")
 .replaceAll(".canonical-09-transformed.mjs",".owner-polish-10-transformed.mjs");
if(runner===source)throw new Error("Canonical browser test contract unavailable");
const tmp=resolve(dir,".owner-polish-10-runner.mjs");
writeFileSync(tmp,runner,"utf8");
try{
 const result=spawnSync(process.execPath,[tmp],{stdio:"inherit",timeout:180000});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error("Owner visual regression exited "+result.status);
}finally{
 unlinkSync(tmp);
}
