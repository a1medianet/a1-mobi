import { notFound } from "next/navigation";
import { SecurityCenter } from "@/components/security-center";

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  return <SecurityCenter locale={locale} />;
}
