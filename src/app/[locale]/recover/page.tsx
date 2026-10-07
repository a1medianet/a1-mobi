import { notFound } from "next/navigation";
import { RecoveryForm } from "@/components/recovery-form";

export default async function RecoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();

  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;

  return <RecoveryForm locale={locale} token={token} />;
}
