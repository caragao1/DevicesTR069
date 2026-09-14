import { ROLES, ROLE_LABELS } from "@/lib/constants";

const inputClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

export function UserForm({
  action,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-200">
          Nome *
        </span>
        <input name="name" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-200">
          E-mail *
        </span>
        <input
          type="email"
          name="email"
          required
          placeholder="pessoa@ixcacs.local"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-200">
          Senha *
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className={inputClass}
        />
        <span className="text-xs text-stone-400 dark:text-slate-500">
          Mínimo de 8 caracteres.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-200">
          Cargo
        </span>
        <select name="role" defaultValue="MEMBRO" className={inputClass}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="self-start rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        Criar usuário
      </button>
    </form>
  );
}
