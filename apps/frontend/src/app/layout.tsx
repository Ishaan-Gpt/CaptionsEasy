import type { Metadata } from "next";
import { Montserrat, Cormorant_Garamond } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "CaptionsEasy — AI Video Editor",
  description: "Create premium social clips with automated caption template layouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="h-full bg-[#0A0B0D] text-[#F1F3F5] font-sans selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
