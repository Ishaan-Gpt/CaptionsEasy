import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MotionAI — Cinematic Captions & AI Editor",
  description: "Convert your talking-head videos into high-quality social-ready clips with cinematic motion typography.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <body className="h-full bg-zinc-950 text-zinc-50 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
