import nodemailer from "nodemailer";
import { recoverySmtpConfig } from "./recovery-mail";

/** Deliver a verification link only to the recovery address, never to an internal alias. */
export async function sendRecoveryEmailVerification(input: {
  email: string; token: string; locale: string;
}) {
  const config = recoverySmtpConfig();
  const origin = new URL(process.env.APP_ORIGIN ?? "");
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    throw new Error("INVALID_APP_ORIGIN");
  if (origin.username || origin.password || origin.search || origin.hash)
    throw new Error("INVALID_APP_ORIGIN");
  const locale = input.locale === "en" ? "en" : "ar";
  const url = new URL(`/${locale}/verify-recovery-email`, origin);
  url.searchParams.set("token", input.token);
  const transporter = nodemailer.createTransport({
    host: config.host, port: Number(config.port), secure: config.port === "465", requireTLS: true,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 7000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  const ar = locale === "ar";
  const subject = ar ? "تأكيد بريد استرداد A1 Mobi" : "Verify your A1 Mobi recovery email";
  const message = ar
    ? "استخدم هذا الرابط خلال 30 دقيقة لتأكيد بريد الاسترداد. يجب تسجيل الدخول إلى حسابك لإتمام التأكيد. تجاهل الرسالة إذا لم تطلبها."
    : "Use this link within 30 minutes to verify your recovery email. You must sign in to confirm. Ignore this message if you did not request it.";
  try {
    await transporter.sendMail({
      from: config.from, to: input.email, subject,
      text: `${message}\n\n${url.toString()}`,
    });
  } finally { transporter.close(); }
}
