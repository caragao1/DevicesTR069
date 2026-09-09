import Link from "next/link";
import type { SessionPayload } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";

export function Header({ session }: { session: SessionPayload | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            IXC ACS
          </span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Limitações de Modelos
          </span>
        </Link>

        {session && (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/models/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700"
            >
              + Novo modelo
            </Link>
            <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">
              {session.name}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Sair
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
