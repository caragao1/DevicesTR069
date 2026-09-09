import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSession } from "@/lib/session";
import { Header } from "@/components/Header";
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
  title: "IXC ACS · Limitações de Modelos",
  description:
    "Consulta de limitações e problemas conhecidos de modelos de equipamentos TR-069 gerenciados pelo IXC ACS.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header session={session} />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
          IXC ACS · Base interna de limitações de modelos TR-069
        </footer>
      </body>
    </html>
  );
}
