import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "A1 Mobi",
  description: "Mobile retail and repair operating platform",
  applicationName:"A1 Mobi",
  manifest:"/manifest.webmanifest",
  icons:{
    icon:[{url:"/favicon.ico",sizes:"64x64",type:"image/x-icon"},{url:"/icon.png",sizes:"512x512",type:"image/png"}],
    apple:[{url:"/apple-icon.png",sizes:"180x180",type:"image/png"}]
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-a1-mobi-locale") === "en" ? "en" : "ar";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
