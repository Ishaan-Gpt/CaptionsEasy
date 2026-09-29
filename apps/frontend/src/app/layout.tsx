import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const fontNormal = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-normal-sys",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fontStyled = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-styled-sys",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CaptionsEasy — AI Kinetic Captions & Motion Typography",
  description:
    "Turn talking-head videos into high-converting viral Shorts & Reels. Automated speech-to-text, frame-accurate timing, and kinetic motion typography.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontNormal.variable} ${fontStyled.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="h-full bg-major text-obsidian font-sans selection:bg-side selection:text-obsidian"
        suppressHydrationWarning
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

