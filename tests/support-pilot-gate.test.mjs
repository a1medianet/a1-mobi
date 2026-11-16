import test from "node:test";
import assert from "node:assert/strict";
import {mobiSupportGate} from "../src/core/support-gate.ts";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
test("Mobi Support pilot gate is disabled by default and requires two independent approvals",()=>{
 assert.equal(mobiSupportGate({}),false);
 assert.equal(mobiSupportGate({A1_MOBI_SUPPORT_FEATURE:"enabled"}),false);
 assert.equal(mobiSupportGate({A1_MOBI_SUPPORT_API_ACCEPTED:"true"}),false);
 assert.equal(mobiSupportGate({A1_MOBI_SUPPORT_FEATURE:"ENABLED",A1_MOBI_SUPPORT_API_ACCEPTED:"true"}),false);
 assert.equal(mobiSupportGate({A1_MOBI_SUPPORT_FEATURE:"enabled",A1_MOBI_SUPPORT_API_ACCEPTED:"TRUE"}),false);
 assert.equal(mobiSupportGate({A1_MOBI_SUPPORT_FEATURE:"enabled",A1_MOBI_SUPPORT_API_ACCEPTED:"true"}),true);
});
test("packaged widget is byte-identical to canonical A1 Support source",()=>{
 const base="C:/A1Hub/";
 const source=readFileSync(base+"a1-support/src/support-center-widget.mjs");
 const installed=readFileSync(base+"_mobi_support_g28/public/a1-addons/support-center.mjs");
 const digest=buffer=>createHash("sha256").update(buffer).digest("hex");
 assert.equal(digest(installed),digest(source));
});
test("Mobi's staged support page gates access before session and renders only trusted widget",()=>{
 const page=readFileSync("src/app/[locale]/support/page.tsx","utf8");
 assert.ok(page.indexOf("mobiSupportGate(process.env)")<page.indexOf("currentStoreContext()"));
 assert.match(page,/if\(!session\)redirect/);
 assert.match(page,/<SupportCenterClient\s*\/>/);
 const client=readFileSync("src/app/[locale]/support/support-center-client.tsx","utf8");
 assert.match(client,/\/api\/a1-support\//);
 assert.doesNotMatch(client,/service[_-]?secret|support[_-]?private[_-]?key/i);
});
