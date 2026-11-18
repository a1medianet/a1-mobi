import {createHash,randomBytes} from "node:crypto";
import nodemailer from "nodemailer";
import {Prisma} from "@prisma/client";
import {db} from "./db";
import {recoverySmtpConfig} from "./recovery-mail";
import {consumeSensitiveActionBudget} from "./attempt-budget";
import {verifyPassword,hashPassword} from "@/core/auth/password";
import {decryptTotpSecret,matchTotpCounter} from "@/core/auth/totp";

const TTL=30*60*1000;
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export class PlatformRecoveryError extends Error{
 constructor(public readonly code:string){super(code);}
}
function safeEmail(value:string){
 const email=value.trim().toLowerCase();
 if(email.length>254||!emailPattern.test(email)||/[\r\n\0]/.test(email))
  throw new PlatformRecoveryError("INVALID_EMAIL");
 return email;
}
function publicOrigin(){
 const value=process.env.APP_ORIGIN;
 if(!value)throw new PlatformRecoveryError("MAIL_UNCONFIGURED");
 const url=new URL(value);
 if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||
   url.search||url.hash)throw new PlatformRecoveryError("MAIL_UNCONFIGURED");
 return url.origin;
}
async function sendMail(input:{email:string;token:string;purpose:"verify"|"reset"}){
 const smtp=recoverySmtpConfig();
 const url=publicOrigin()+"/platform/recover/"+input.purpose+"?token="+encodeURIComponent(input.token);
 const transport=nodemailer.createTransport({
  host:smtp.host,port:Number(smtp.port),secure:smtp.port==="465",requireTLS:true,
  auth:{user:smtp.user,pass:smtp.password},
  tls:{minVersion:"TLSv1.2",rejectUnauthorized:true},
  connectionTimeout:5000,greetingTimeout:5000,socketTimeout:7000,
  disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false,
 });
 const heading=input.purpose==="verify"?"توثيق بريد استرداد مالك A1 Mobi":"استرداد حساب مالك A1 Mobi";
 try{
  await transport.sendMail({from:smtp.from,to:input.email,subject:heading,
   text:heading+"\nاستخدم هذا الرابط مرة واحدة خلال 30 دقيقة:\n"+url+
    "\nإذا لم تطلب ذلك، تجاهل هذه الرسالة. لن تتغير بيانات حسابك تلقائيًا."});
 }finally{transport.close();}
}
async function createToken(adminId:string,email:string,purpose:"VERIFY_EMAIL"|"RESET_PASSWORD"){
 const token=randomBytes(32).toString("base64url");
 const row=await db.platformRecoveryToken.create({data:{
  adminId,email,purpose,tokenHash:hash(token),expiresAt:new Date(Date.now()+TTL),
 }});
 return {token,row};
}
async function sendAndMark(input:{token:string;row:{id:string};email:string;purpose:"verify"|"reset"}){
 try{
  await sendMail({email:input.email,token:input.token,purpose:input.purpose});
  const saved=await db.platformRecoveryToken.updateMany({where:{
    id:input.row.id,usedAt:null,deliveredAt:null,expiresAt:{gt:new Date()},
   },data:{deliveredAt:new Date()}});
  if(saved.count!==1)throw new PlatformRecoveryError("TOKEN_EXPIRED");
  return true;
 }catch{
  await db.platformRecoveryToken.updateMany({where:{id:input.row.id,usedAt:null},
   data:{usedAt:new Date()}});
  return false;
 }
}
export async function requestPlatformRecoveryEmailVerification(input:{
 adminId:string;email:string;password:string;secondFactor:string;
}){
 await consumeSensitiveActionBudget("platform-recovery-enroll",[input.adminId],3);
 const email=safeEmail(input.email);
 if(!/^\d{6}$/.test(input.secondFactor))throw new PlatformRecoveryError("INVALID_CONFIRMATION");
 // Fail before mutating any account if live mail is not usable.
 publicOrigin();recoverySmtpConfig();
 const admin=await db.platformAdmin.findFirst({where:{id:input.adminId,isActive:true}});
 if(!admin||!await verifyPassword(admin.passwordHash,input.password))
  throw new PlatformRecoveryError("INVALID_CONFIRMATION");
 const counter=matchTotpCounter(decryptTotpSecret(admin.totpSecretCipher),input.secondFactor);
 if(counter===null)throw new PlatformRecoveryError("INVALID_CONFIRMATION");
 const updated=await db.platformAdmin.updateMany({where:{
  id:admin.id,isActive:true,
  OR:[{lastTotpCounter:null},{lastTotpCounter:{lt:counter}}],
 },data:{lastTotpCounter:counter,recoveryEmail:email,recoveryEmailVerifiedAt:null}});
 if(updated.count!==1)throw new PlatformRecoveryError("INVALID_CONFIRMATION");
 // Earlier enrollment/reset tokens are invalidated if the destination changes.
 await db.platformRecoveryToken.updateMany({where:{adminId:admin.id,usedAt:null},
  data:{usedAt:new Date()}});
 const {token,row}=await createToken(admin.id,email,"VERIFY_EMAIL");
 const sent=await sendAndMark({token,row,email,purpose:"verify"});
 if(!sent)throw new PlatformRecoveryError("MAIL_UNAVAILABLE");
 return {accepted:true,verificationPending:true};
}
export async function verifyPlatformRecoveryEmail(token:string){
 await consumeSensitiveActionBudget("platform-recovery-verify",[hash(token)],8);
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new PlatformRecoveryError("INVALID_TOKEN");
 return db.$transaction(async tx=>{
  const record=await tx.platformRecoveryToken.findUnique({where:{tokenHash:hash(token)}});
  if(!record||record.purpose!=="VERIFY_EMAIL"||record.usedAt||
    !record.deliveredAt||record.expiresAt<=new Date())
    throw new PlatformRecoveryError("INVALID_TOKEN");
  const updated=await tx.platformAdmin.updateMany({where:{
    id:record.adminId,isActive:true,recoveryEmail:record.email,recoveryEmailVerifiedAt:null,
   },data:{recoveryEmailVerifiedAt:new Date()}});
  if(updated.count!==1)throw new PlatformRecoveryError("INVALID_TOKEN");
  await tx.platformRecoveryToken.updateMany({where:{adminId:record.adminId,usedAt:null},
   data:{usedAt:new Date()}});
  return {verified:true};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
export async function requestPlatformPasswordReset(emailInput:string){
 const email=safeEmail(emailInput);
 await consumeSensitiveActionBudget("platform-recovery-request",[email],3);
 const admin=await db.platformAdmin.findUnique({where:{email}});
 if(!admin?.isActive||!admin.recoveryEmail||!admin.recoveryEmailVerifiedAt)
  return {accepted:true};
 try{
  publicOrigin();recoverySmtpConfig();
  await db.platformRecoveryToken.updateMany({where:{
   adminId:admin.id,purpose:"RESET_PASSWORD",usedAt:null,
  },data:{usedAt:new Date()}});
  const {token,row}=await createToken(admin.id,admin.recoveryEmail,"RESET_PASSWORD");
  await sendAndMark({token,row,email:admin.recoveryEmail,purpose:"reset"});
 }catch{/* Generic response prevents user enumeration and SMTP state disclosure. */}
 return {accepted:true};
}
export async function resetPlatformPassword(input:{
 token:string;newPassword:string;secondFactor:string;
}){
 await consumeSensitiveActionBudget("platform-recovery-reset",[hash(input.token)],8);
 if(!/^[A-Za-z0-9_-]{43}$/.test(input.token)||
   input.newPassword.length<16||input.newPassword.length>256||
   !/^\d{6}$/.test(input.secondFactor))
   throw new PlatformRecoveryError("INVALID_TOKEN");
 const record=await db.platformRecoveryToken.findUnique({
  where:{tokenHash:hash(input.token)},include:{admin:true},
 });
 if(!record||record.purpose!=="RESET_PASSWORD"||record.usedAt||!record.deliveredAt||
   record.expiresAt<=new Date()||!record.admin.isActive||
   record.email!==record.admin.recoveryEmail||!record.admin.recoveryEmailVerifiedAt)
   throw new PlatformRecoveryError("INVALID_TOKEN");
 const counter=matchTotpCounter(decryptTotpSecret(record.admin.totpSecretCipher),input.secondFactor);
 if(counter===null)throw new PlatformRecoveryError("INVALID_TOKEN");
 const passwordHash=await hashPassword(input.newPassword);
 return db.$transaction(async tx=>{
  const used=await tx.platformRecoveryToken.updateMany({where:{
   id:record.id,usedAt:null,deliveredAt:{not:null},expiresAt:{gt:new Date()},
  },data:{usedAt:new Date()}});
  if(used.count!==1)throw new PlatformRecoveryError("INVALID_TOKEN");
  const updated=await tx.platformAdmin.updateMany({where:{
   id:record.adminId,isActive:true,recoveryEmail:record.email,
   OR:[{lastTotpCounter:null},{lastTotpCounter:{lt:counter}}],
  },data:{passwordHash,lastTotpCounter:counter}});
  if(updated.count!==1)throw new PlatformRecoveryError("INVALID_TOKEN");
  await tx.platformSession.updateMany({where:{adminId:record.adminId,revokedAt:null},
   data:{revokedAt:new Date()}});
  await tx.platformRecoveryToken.updateMany({where:{adminId:record.adminId,usedAt:null},
   data:{usedAt:new Date()}});
  return {reset:true,sessionsRevoked:true};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
