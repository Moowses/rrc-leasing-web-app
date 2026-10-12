import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

const manrope = localFont({ src: "../public/assets/Manrope.ttf", variable: "--font-manrope", display: "swap" });
const sourceSans = localFont({ src: "../public/assets/SourceSans3.ttf", variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Rosefood Realty Corporation",
  description: "Explore commercial and residential spaces with Rosefood Realty Corporation.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();
  return <html lang="en-PH"><body className={`${manrope.variable} ${sourceSans.variable}`}>{children}</body></html>;
}
