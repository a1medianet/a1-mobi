// Gate A: disposable isolated PostgreSQL only. No secrets are printed.
const {PrismaClient}=require('@prisma/client');
const argon2=require('argon2');
const {randomBytes,createCipheriv,createHmac}=require('node:crypto');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const db=new PrismaClient();
const origin='http://127.0.0.1:4327';
const url=new URL(process.env.DATABASE_URL||'');
if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/mobi_platform_test')throw Error('REFUSE_NON_ISOLATED_DATABASE');
if(!process.env.A1_MOBI_MFA_ENCRYPTION_KEY)throw Error('MFA_KEY_REQUIRED');
const key=Buffer.from(process.env.A1_MOBI_MFA_ENCRYPTION_KEY,'hex');
assert.equal(key.length,32);
const results=[];
const check=(name,condition)=>{assert.ok(condition,name);results.push(name);console.log('PASS',name)};
function code(secret,shift=0){const c=Buffer.alloc(8);c.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)+shift));const h=createHmac('sha1',secret).update(c).digest();const off=h[19]&15;return (((h[off]&127)<<24)|(h[off+1]<<16)|(h[off+2]<<8)|h[off+3])%1000000+'';}
function six(secret,shift=0){return code(secret,shift).padStart(6,'0')}
function base32(bytes){const alpha='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){result+=alpha[(value>>>(bits-5))&31];bits-=5;}}if(bits)result+=alpha[(value<<(5-bits))&31];return result;}
function encrypt(secret){const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',key,iv);return ['v1',iv.toString('base64url'),c.update(secret).toString('base64url')+c.final().toString('base64url'),c.getAuthTag().toString('base64url')]}
function cipher(secret){const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',key,iv);const enc=Buffer.concat([c.update(secret),c.final()]);return ['v1',iv.toString('base64url'),c.getAuthTag().toString('base64url'),enc.toString('base64url')].join('.')}
async function req(path,method='GET',body,cookie,originOverride=origin){return fetch(origin+path,{method,redirect:'manual',headers:{...(method==='POST'?{'content-type':'application/json',origin:originOverride}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined})}
async function main(){let child,admin,other;const password=randomBytes(24).toString('base64url');const email='gate-a-'+randomBytes(7).toString('hex')+'@invalid.example';const secret=randomBytes(20);const payload={email,password};try{
admin=await db.platformAdmin.create({data:{email,passwordHash:await argon2.hash(password,{type:argon2.argon2id}),totpSecretCipher:cipher(base32(secret))}});
const second='gate-a-'+randomBytes(7).toString('hex')+'@invalid.example';other=await db.platformAdmin.create({data:{email:second,passwordHash:await argon2.hash(password,{type:argon2.argon2id}),totpSecretCipher:cipher(base32(randomBytes(20)))}});
child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4327'],{cwd:process.cwd(),env:{...process.env,APP_ORIGIN:origin,A1_MOBI_DIST_DIR:'.next-platform-gatea'},stdio:['ignore','pipe','pipe'],windowsHide:true});let diagnostics='';child.stdout.on('data',chunk=>{diagnostics+=chunk.toString();});child.stderr.on('data',chunk=>{diagnostics+=chunk.toString();});
let ready=false;for(let i=0;i<75;i++){if(child.exitCode!==null)break;try{const r=await req('/platform/login');if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}
if(!ready)console.log('SERVER_START_DIAGNOSTIC',diagnostics.slice(-1800));check('server ready',ready);
let r=await req('/platform/console');check('unauthenticated console redirect',r.status===307&&r.headers.get('location')?.includes('/platform/login'));
r=await req('/api/platform/login','POST',{...payload,password:'wrong',secondFactor:six(secret)});console.log('DIAG_WRONG_PASSWORD_HTTP',r.status);check('wrong password denied',r.status===401);
r=await req('/api/platform/login','POST',{...payload,secondFactor:'000000'});console.log('DIAG_WRONG_TOTP_HTTP',r.status,'BODY',(await r.text()).slice(0,180));check('wrong TOTP denied',r.status===401);
r=await req('/api/platform/login','POST',{...payload,secondFactor:six(secret)},undefined,'https://evil.invalid');check('cross origin denied',r.status===403);
r=await req('/api/platform/login','POST',{...payload,secondFactor:six(secret)});check('correct password and TOTP',r.status===200);
let cookie=r.headers.get('set-cookie')?.split(';')[0];check('platform cookie issued',Boolean(cookie&&cookie.startsWith('a1-mobi-platform=')));
r=await req('/platform/console','GET',null,cookie);check('authenticated console',r.status===200);
r=await req('/api/platform/login','POST',{...payload,secondFactor:six(secret)});check('TOTP replay denied',r.status===401);
r=await req('/api/platform/logout','POST',{},cookie);check('logout',r.status===200);
r=await req('/platform/console','GET',null,cookie);check('revoked session denied',r.status===307);
const expired=randomBytes(32).toString('base64url');const {createHash}=require('node:crypto');const hash=createHash('sha256').update(expired).digest('hex');await db.platformSession.create({data:{adminId:admin.id,tokenHash:hash,expiresAt:new Date(Date.now()-1000)}});r=await req('/platform/console','GET',null,'a1-mobi-platform='+expired);check('expired platform session denied',r.status===307);
for(let i=0;i<6;i++)r=await req('/api/platform/login','POST',{...payload,password:'bad',secondFactor:six(secret)});check('rate limit after failures',r.status===429);
check('no tenant created',await db.tenant.count()===0);
console.log('GATE_A_PASS_COUNT',results.length);
}finally{if(child){child.kill();}if(admin)await db.platformAdmin.delete({where:{id:admin.id}});if(other)await db.platformAdmin.delete({where:{id:other.id}});await db.$disconnect();console.log('CLEANUP_COMPLETE')}}main().catch(e=>{console.error('GATE_A_FAIL',e.message);process.exitCode=1});
