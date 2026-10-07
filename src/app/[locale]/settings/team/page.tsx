import { notFound } from "next/navigation";
import { TeamAdmin } from "@/components/team-admin";

export default async function TeamSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  return <TeamAdmin locale={locale} />;
}
