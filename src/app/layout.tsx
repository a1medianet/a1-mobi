import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A1 Mobi",
  description: "Mobile retail and repair operating platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}