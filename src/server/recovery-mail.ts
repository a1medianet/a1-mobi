import nodemailer from "nodemailer";
import { z } from "zod";

const cleanString = z.string().min(1).max(512).refine(value => !/[\r\n\0]/.test(value));
export function recoverySmtpConfig() {
  const config = z.object({
    host: cleanString.refine(value => /^[a-zA-Z0-9.-]+$/.test(value)),
    port: z.enum(["465", "587"]),
    user: cleanString,
    password: cleanString,
    from: z.email().max(254),
  }).parse({
    host: process.env.A1_MOBI_SMTP_HOST,
    port: process.env.A1_MOBI_SMTP_PORT,
    user: process.env.A1_MOBI_SMTP_USER,
    password: process.env.A1_MOBI_SMTP_PASSWORD,
    from: process.env.A1_MOBI_SMTP_FROM,
  });
  return config;
}

export const recoveryMailSchema = z.object({
  email: z.email().max(254),
  tenant: cleanString,
  locale: z.enum(["ar", "en"]),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  resetUrl: z.string().max(2048),
  expiresAt: z.iso.datetime(),
}).strict();

export function validateRecoveryMail(value: unknown) {
  const input = recoveryMailSchema.parse(value);
  const origin = new URL(process.env.APP_ORIGIN ?? "");
  const url = new URL(input.resetUrl);
  if (origin.protocol !== "https:" || url.protocol !== "https:" ||
    url.origin !== origin.origin || url.username || url.password || url.hash ||
    url.pathname !== `/${input.locale}/recover` ||
    [...url.searchParams.keys()].some(key => key !== "token") ||
    url.searchParams.getAll("token").length !== 1 ||
    url.searchParams.get("token") !== input.token ||
    Date.parse(input.expiresAt) <= Date.now() ||
    Date.parse(input.expiresAt) > Date.now() + 31 * 60 * 1000) {
    throw new Error("INVALID_RECOVERY_MAIL");
  }
  return input;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export async function sendRecoveryMail(input: ReturnType<typeof validateRecoveryMail>) {
  const config = recoverySmtpConfig();
  const transport = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: config.port === "465",
    requireTLS: true,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const ar = input.locale === "ar";
  const subject = ar ? "إعادة تعيين كلمة المرور — A1 Mobi" : "Reset your password — A1 Mobi";
  const message = ar
    ? "طلبت إعادة تعيين كلمة المرور. استخدم الرابط التالي قبل انتهاء صلاحيته خلال 30 دقيقة. إذا لم تطلب ذلك، تجاهل هذه الرسالة."
    : "You requested a password reset. Use the link below before it expires within 30 minutes. If you did not request this, ignore this email.";
  try {
    await transport.sendMail({
      from: config.from,
      to: input.email,
      subject,
      text: `${message}\n\n${input.resetUrl}\n\n${input.expiresAt}`,
      html: `<div lang="${input.locale}" dir="${ar ? "rtl" : "ltr"}"><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(input.resetUrl)}">${ar ? "إعادة تعيين كلمة المرور" : "Reset password"}</a></p><p>${escapeHtml(input.expiresAt)}</p></div>`,
    });
  } finally {
    transport.close();
  }
}
