import { loginAction } from "@/lib/actions/auth";
import { BrandIcon } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 pt-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
          <BrandIcon className="h-5 w-5 text-teal-400" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Entrar
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
            Acesso interno da equipe IXC ACS.
          </p>
        </div>
      </div>

      <form
        action={loginAction}
        className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">
            E-mail
          </span>
          <input
            type="email"
            name="email"
            required
            autoFocus
            placeholder="voce@ixcacs.local"
            className="rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">
            Senha
          </span>
          <input
            type="password"
            name="password"
            required
            className="rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
