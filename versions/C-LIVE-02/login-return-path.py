from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
proxy=r/"src/proxy.ts"
s=proxy.read_text(encoding="utf8")
old='''      url.pathname = "/" + parts[0] + "/login";
      url.search = "";
      return NextResponse.redirect(url);'''
new='''      url.pathname = "/" + parts[0] + "/login";
      url.search = "";
      // Server-generated local pathname only; never trust external redirect URLs.
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);'''
assert s.count(old)==1
proxy.write_text(s.replace(old,new),encoding="utf8",newline="\n")
login=r/"src/app/[locale]/login/page.tsx"
s=login.read_text(encoding="utf8")
s=s.replace('import { LoginForm } from "@/components/login-form";','import { LoginForm } from "@/components/login-form";\nimport { safeStoreReturnPath } from "@/core/auth/safe-return-path";')
s=s.replace('searchParams:Promise<{tenant?:string;email?:string}>;','searchParams:Promise<{tenant?:string;email?:string;next?:string}>;')
old='''  return <LoginForm locale={locale} initialTenant={query.tenant||""} initialEmail={query.email||""}/>;'''
new='''  return <LoginForm locale={locale} initialTenant={query.tenant||""}
    initialEmail={query.email||""} returnTo={safeStoreReturnPath(query.next,locale)}/>;'''
assert s.count(old)==1
login.write_text(s.replace(old,new),encoding="utf8",newline="\n")
form=r/"src/components/login-form.tsx"
s=form.read_text(encoding="utf8")
old='''export function LoginForm({ locale, initialTenant = "", initialEmail = "" }: { locale: "ar" | "en"; initialTenant?: string; initialEmail?: string }) {'''
new='''export function LoginForm({ locale, initialTenant = "", initialEmail = "", returnTo }: {
  locale: "ar" | "en"; initialTenant?: string; initialEmail?: string; returnTo: string;
}) {'''
assert s.count(old)==1
s=s.replace(old,new)
old='''        setNeedsFactor(false);
        setActive(true);
      }
    } catch {'''
new='''        setNeedsFactor(false);
        setActive(true);
        // Session cookie is set by the API; the protected page is rechecked by proxy.
        window.location.assign(returnTo);
      }
    } catch {'''
assert s.count(old)==1
s=s.replace(old,new)
s=s.replace('<Link href={"/" + locale}>{t.preview}</Link>','<Link href={returnTo}>{t.preview}</Link>')
form.write_text(s,encoding="utf8",newline="\n")
print("LOGIN_RETURN_TO_REQUESTED_AUTHENTICATED_PAGE_IMPLEMENTED")
