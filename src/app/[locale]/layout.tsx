import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { currentStoreContext } from "@/server/auth-http";

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  const ar = locale === "ar";
  const currentPath = (await headers()).get("x-a1-mobi-path") || "";
  const isAuthPage = ["/"+locale+"/login", "/"+locale+"/recover"].some(
    path => currentPath === path || currentPath.startsWith(path+"/")
  );
  if (isAuthPage) {
    return <div lang={locale} dir={ar?"rtl":"ltr"} className="mobi-auth-shell">
      <header className="mobi-auth-header">
        <Link href={"/product/"+locale} className="mobi-auth-brand">A1 <strong>Mobi</strong></Link>
        <nav aria-label={ar?"روابط الحساب":"Account links"}>
          <Link href={"/product/"+locale}>{ar?"عن النظام":"About Mobi"}</Link>
          <Link href={"/product/"+locale+"/demo"}>{ar?"جولة تعريفية":"Product tour"}</Link>
          <Link href={"/product/"+locale+"/signup"}>{ar?"إنشاء حساب":"Create account"}</Link>
          <Link href={"/"+locale+"/login"}>{ar?"دخول المتجر":"Store sign in"}</Link>
        </nav>
      </header>
      <div className="mobi-auth-content">{children}</div>
    </div>;
  }
  const account = await currentStoreContext().catch(() => null);
  if (!account) redirect("/"+locale+"/login");
  return <AppShell locale={locale}>{children}</AppShell>;
}
