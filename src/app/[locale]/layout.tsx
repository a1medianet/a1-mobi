import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  return <AppShell locale={locale}>{children}</AppShell>;
}
