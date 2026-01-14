import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { PaperWrapper } from "@/components/paper-wrapper";
import DynamicIslandLetterPlayer from "@/components/dynamic-island-letter-player";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const abcMarist = localFont({
  src: "../../public/fonts/ABCMarist-Regular-Trial.otf",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "How to fix your entire life in 1 day",
  description:
    "A comprehensive protocol to reset your life and launch into a season of intense progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${abcMarist.variable} antialiased bg-[#e8e6e1] text-zinc-900 selection:bg-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-zinc-800`}
      >
        <div className="min-h-screen py-16 sm:py-20 px-4 sm:px-8 max-w-3xl mx-auto">
          <PaperWrapper className="shadow-xl">
            <article className="prose prose-neutral max-w-none prose-lg">
              {children}
            </article>
          </PaperWrapper>
        </div>
        <DynamicIslandLetterPlayer />
      </body>
    </html>
  );
}
