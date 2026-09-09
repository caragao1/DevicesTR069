import { loginAction } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Entrar
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Acesso interno da equipe IXC ACS.
        </p>
      </div>

      <form action={loginAction} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            E-mail
          </span>
          <input
            type="email"
            name="email"
            required
            autoFocus
            placeholder="voce@ixcacs.local"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Senha
          </span>
          <input
            type="password"
            name="password"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
