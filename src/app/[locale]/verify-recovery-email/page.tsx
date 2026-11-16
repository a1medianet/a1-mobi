import { notFound } from "next/navigation";
import { RecoveryEmailVerificationForm } from "@/components/recovery-email-verification-form";

export default async function VerifyRecoveryEmail({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  if (locale !== "ar" && locale !== "en") notFound();
  return <main style={{maxWidth:540,margin:"70px auto",padding:24}}>
    <h1>{locale === "ar" ? "تأكيد بريد الاسترداد" : "Verify recovery email"}</h1>
    <p>{locale === "ar" ? "سجّل الدخول إلى حسابك أولًا، ثم أكّد بريد الاسترداد من هنا." : "Sign in to your account, then confirm your recovery email here."}</p>
    <RecoveryEmailVerificationForm locale={locale} token={typeof token === "string" ? token : ""}/>
  </main>;
}
