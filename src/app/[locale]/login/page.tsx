import { notFound } from "next/navigation";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  return <LoginForm locale={locale} />;
}
