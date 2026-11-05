from pathlib import Path
r=Path(r"C:\A1Hub\a1-mobi")
p=r/"scripts/abc-http-smoke.mjs"
s=p.read_text(encoding="utf8")
old='''const unauth = await expectStatus("/ar",[307,308]);
assert((unauth.headers.get("location") || "").endsWith("/ar/login"), "Back office must redirect unauthenticated users to /ar/login");'''
new='''for (const target of ["/ar", "/ar/live-02"]) {
  const unauth = await expectStatus(target,[307,308]);
  const location = unauth.headers.get("location") || "";
  const redirected = new URL(location,base);
  assert(redirected.origin === new URL(base).origin, "Auth redirect must stay on the same origin");
  assert(redirected.pathname === "/ar/login", "Back office must redirect to Arabic login");
  assert(redirected.searchParams.get("next") === target, "Auth redirect must preserve intended protected page");
}'''
assert s.count(old)==1
p.write_text(s.replace(old,new),encoding="utf8",newline="\n")
print("HTTP_SMOKE_EXPECTED_AUTH_RETURN_UPDATED")
