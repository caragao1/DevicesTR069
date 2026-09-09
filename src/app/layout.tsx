import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal"],
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
      className={`${sourceSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full font-sans text-stone-900 dark:text-stone-50">
        {session && <Sidebar session={session} />}
        <div className="flex min-h-screen flex-1 flex-col bg-stone-50 dark:bg-slate-950">
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-10">
            {children}
          </main>
          <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-400 dark:border-slate-800 dark:text-slate-500">
            IXC ACS · Base interna de limitações de modelos TR-069
          </footer>
        </div>
      </body>
    </html>
  );
}
