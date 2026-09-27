import { DOMAIN_NAMES } from "@/core/config/domains";
import { localeDirection, resolveLocale } from "@/core/config/locales";
import { notFound } from "next/navigation";

export default async function FoundationPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const raw = (await params).locale;
  if (raw !== "ar" && raw !== "en") notFound();
  const locale = resolveLocale(raw);
  const ar = locale === "ar";
  return (
    <main dir={localeDirection[locale]} className="mx-auto max-w-5xl p-8">
      <p className="text-sm text-slate-500">Stage 1 — Foundation</p>
      <h1 className="mt-2 text-4xl font-bold">A1 Mobi</h1>
      <p className="mt-4 text-lg">
        {ar ? "تم تثبيت أساس المنصة وحدود المجالات." :
          "Platform foundation and domain boundaries are established."}
      </p>
      <h2 className="mt-8 text-2xl font-semibold">
        {ar ? "المجالات المعتمدة" : "Locked domains"}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {DOMAIN_NAMES.map((name) => (
          <li key={name} className="rounded-lg border p-4">{name}</li>
        ))}
      </ul>
    </main>
  );
}