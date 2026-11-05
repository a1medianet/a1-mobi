from pathlib import Path
from subprocess import run
import secrets, sys
root=Path(r"C:\A1Hub\a1-mobi")
local=root/".local"
local.mkdir(exist_ok=True)
postgres=local/"postgres-techzone-uat"
env_file=root/".env.local"
owner_file=local/"techzone-owner-login.txt"
if env_file.exists() or owner_file.exists():
    print("SAFETY_HOLD: Existing local credentials or env file found; will not replace.",file=sys.stderr)
    sys.exit(3)
postgres.mkdir(exist_ok=True)
dbpassword=secrets.token_hex(18)
ownerpassword=secrets.token_urlsafe(24)
bootstrap=secrets.token_hex(32)
name="a1-mobi-techzone-uat-20261017"
check=run(["docker","container","inspect",name],capture_output=True)
if check.returncode==0:
    print("SAFETY_HOLD: Demo database container already exists, refusing duplicate.",file=sys.stderr)
    sys.exit(4)
runargs=[
 "docker","run","-d","--name",name,"--label","a1.project=a1-mobi",
 "-p","127.0.0.1:5438:5432",
 "-e","POSTGRES_DB=mobi_uat",
 "-e","POSTGRES_USER=mobi_uat",
 "-e","POSTGRES_PASSWORD="+dbpassword,
 "-v",str(postgres)+":/var/lib/postgresql/data",
 "postgres:17-alpine"
]
result=run(runargs,capture_output=True,text=True,timeout=120)
if result.returncode:
 print("DOCKER_FAILED",result.stderr[-600:],file=sys.stderr)
 sys.exit(result.returncode)
env_file.write_text("\n".join([
 "# Thaghr local UAT only. NEVER commit to GitHub or publish.",
 "DATABASE_URL=postgresql://mobi_uat:"+dbpassword+"@127.0.0.1:5438/mobi_uat?schema=public",
 "APP_ORIGIN=http://127.0.0.1:3185",
 "A1_MOBI_BOOTSTRAP_SECRET="+bootstrap,
 "A1_MOBI_PUBLIC_TRIAL_ENABLED=0",
 "A1_MOBI_ENFORCE_ENTITLEMENTS=0",
 "A1_SHARED_SERVICES_REQUIRED=0",
 "A1_MOBI_MFA_ENCRYPTION_KEY="+secrets.token_hex(32),
 "A1_APP_RELEASE_CHANNEL=pilot",
 ""
]),encoding="utf-8")
owner_file.write_text("\n".join([
 "LOCAL / THAGHR / ONLY — NOT A PRODUCTION ACCOUNT",
 "URL: http://127.0.0.1:3185/ar/login",
 "Tenant / Store ID: techzone-demo",
 "Email: owner@techzone.demo",
 "Password: "+ownerpassword,
 "This account is usable only AFTER setup-store-owner.py succeeds.",
 ""
]),encoding="utf-8")
print("LOCAL_DEMO_CONTAINER_CREATED:",name)
print("LOCAL_CREDENTIAL_FILE:",owner_file)
print("LOCAL_DATABASE_DIR:",postgres)
print("NO_CREDENTIALS_PRINTED")
