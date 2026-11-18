import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {turnstileEnabled,verifyTurnstile} from "@/server/turnstile";

describe("visible login policy",()=>{
 it("requires explicit opt-in for always-visible login checks",()=>{
   expect(turnstileEnabled("login",{})).toBe(false);
   expect(turnstileEnabled("login",{A1_MOBI_TURNSTILE_LOGIN_ALWAYS_ENABLED:"1"})).toBe(true);
   expect(turnstileEnabled("login",{A1_MOBI_TURNSTILE_LOGIN_ALWAYS_ENABLED:"0"})).toBe(false);
 });
 it("verifies a visible login token on the server, not only in the browser",async()=>{
   const env={A1_MOBI_TURNSTILE_LOGIN_ALWAYS_ENABLED:"1",A1_MOBI_TURNSTILE_SECRET:"testing-secret",A1_MOBI_TURNSTILE_HOSTNAME:"mobi.a1net.tech"};
   const req=new Request("https://mobi.a1net.tech/api/auth/login",{method:"POST"});
   expect(await verifyTurnstile({request:req,surface:"login",env})).toBe("MISSING");
   const fetcher=vi.fn(async()=>new Response(JSON.stringify({success:true,hostname:"mobi.a1net.tech",action:"login"})));
   expect(await verifyTurnstile({request:req,surface:"login",token:"test-token",env,fetcher:fetcher as unknown as typeof fetch})).toBe("VERIFIED");
   expect(await verifyTurnstile({request:req,surface:"login",token:"test-token",env,fetcher:vi.fn(async()=>new Response(JSON.stringify({success:false,error_codes:["timeout-or-duplicate"]}))) as unknown as typeof fetch})).toBe("REJECTED");
 });
});
const req=new Request("https://mobi.a1net.tech/api/onboarding/trial",{method:"POST",headers:{"cf-connecting-ip":"192.0.2.1"}});
const env={A1_MOBI_TURNSTILE_ENABLED:"1",A1_MOBI_TURNSTILE_SECRET:"private-example",A1_MOBI_TURNSTILE_HOSTNAME:"mobi.a1net.tech"};
describe("Turnstile server-side verification",()=>{
 it("keeps not-yet-enabled routes unaffected",async()=>{
   expect(await verifyTurnstile({request:req,surface:"signup",env:{}})).toBe("DISABLED");
 });
 it("rejects missing secrets and tokens",async()=>{
   expect(await verifyTurnstile({request:req,surface:"signup",env:{A1_MOBI_TURNSTILE_ENABLED:"1"}})).toBe("UNAVAILABLE");
   expect(await verifyTurnstile({request:req,surface:"signup",env})).toBe("MISSING");
 });
 it("validates hostname and exact action from Cloudflare",async()=>{
   const fetcher=vi.fn(async()=>new Response(JSON.stringify({success:true,hostname:"mobi.a1net.tech",action:"signup"}),{status:200}));
   expect(await verifyTurnstile({request:req,surface:"signup",token:"valid-mock-token",env,fetcher:fetcher as unknown as typeof fetch})).toBe("VERIFIED");
   expect(fetcher).toHaveBeenCalledOnce();
   const args=fetcher.mock.calls[0] as unknown as [string,{body:string}];
   expect(args[0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
   const params=new URLSearchParams(args[1].body);
   expect(params.get("secret")).toBe(env.A1_MOBI_TURNSTILE_SECRET);
   expect(params.has("remoteip")).toBe(false); // spoofable request headers are ignored
 });
 it("rejects false positives including mismatched action, hostname, and replay failures",async()=>{
   for(const response of [
    {success:true,hostname:"other.example",action:"signup"},
    {success:true,hostname:"mobi.a1net.tech",action:"recovery"},
    {success:false,hostname:"mobi.a1net.tech",action:"signup"},
   ]){
    const fetcher=vi.fn(async()=>new Response(JSON.stringify(response)));
    expect(await verifyTurnstile({request:req,surface:"signup",token:"abc",env,fetcher:fetcher as unknown as typeof fetch})).toBe("REJECTED");
   }
 });
 it("fails closed on Cloudflare outages and overlong tokens",async()=>{
   const fetcher=vi.fn(async()=>{throw new Error("network");});
   expect(await verifyTurnstile({request:req,surface:"signup",token:"abc",env,fetcher:fetcher as unknown as typeof fetch})).toBe("UNAVAILABLE");
   expect(await verifyTurnstile({request:req,surface:"signup",token:"x".repeat(2049),env})).toBe("MISSING");
 });
});
