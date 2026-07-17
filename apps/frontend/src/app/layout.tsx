import type { Metadata } from "next";
import { Montserrat, Sora, JetBrains_Mono, Fraunces } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "CaptionsEasy — Cinematic captions for short-form video",
  description:
    "Upload a talking-head clip. CaptionsEasy transcribes every word, times it to your voice, and renders cinematic animated captions ready for Reels, Shorts, and TikTok.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${sora.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="h-full bg-dune-white text-ink font-sans selection:bg-sand-300 selection:text-ink">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
