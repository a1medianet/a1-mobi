// One-click, explicit opt-in LOCAL acceptance. Does not deploy, migrate, or create accounts.
// Never logs or commits credentials; only uses the isolated Thaghr test DB containers.
const {execFileSync,spawnSync}=require('node:child_process');
const {existsSync}=require('node:fs');
const path=require('node:path');
if(process.env.NODE_ENV==='production'||process.env.A1_SUPPORT_LOCAL_TEST_GATE!=='enabled'){
 console.error('SUPPORT_G28_GATE_DISABLED');process.exit(2);
}
const root=path.resolve(__dirname,'..');
const vitest=path.join(root,'node_modules','vitest','vitest.mjs');
if(!existsSync(vitest)){console.error('SUPPORT_G28_TEST_DEPENDENCIES_MISSING');process.exit(2);}
function urlFor(container,port,db){
 const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];
 if(info.State.Running!==true)throw Error('LOCAL_DATABASE_NOT_RUNNING');
 const e=Object.fromEntries(info.Config.Env.map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
 if(!e.POSTGRES_PASSWORD)throw Error('LOCAL_DATABASE_CREDENTIAL_UNAVAILABLE');
 return 'postgresql://'+encodeURIComponent(e.POSTGRES_USER||'postgres')+':'+encodeURIComponent(e.POSTGRES_PASSWORD)+
  '@127.0.0.1:'+port+'/'+encodeURIComponent(db||e.POSTGRES_DB||'postgres');
}
try{
 const mobi=urlFor('a1-mobi-uat-local-pg',5438,'a1_mobi_support_g28_isolated');
 const support=urlFor('a1-support-g1-db',55489);
 const env={...process.env,DATABASE_URL:mobi,A1_SUPPORT_TEST_DATABASE_URL:support};
 const nodeTests=spawnSync(process.execPath,['--test','tests/support-pilot-gate.test.mjs','tests/support-local-contract.test.mjs'],{
  cwd:root,env,stdio:'inherit'});
 if(nodeTests.status!==0)throw Error('SUPPORT_G28_LOCAL_CONTRACT_FAILED');
 const apiTests=spawnSync(process.execPath,[vitest,'run','tests/support-api-route.test.ts',
  'tests/support-mobi-real-session-db.test.ts','--maxWorkers=1'],{cwd:root,env,stdio:'inherit'});
 if(apiTests.status!==0)throw Error('SUPPORT_G28_REAL_SESSION_GATE_FAILED');
 console.log('SUPPORT_G28_ONE_CLICK_LOCAL_ACCEPTANCE_PASS (7 node + 9 vitest)');
}catch(e){console.error('SUPPORT_G28_GATE_FAILED '+e.message);process.exitCode=1;}
