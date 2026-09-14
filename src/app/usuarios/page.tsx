import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { deleteUserAction, updateUserRoleAction } from "@/lib/actions/users";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { PlusIcon } from "@/components/icons";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export default async function UsersPage({
  searchParams,
}: PageProps<"/usuarios">) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Usuários
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
            Gerencie quem tem acesso ao sistema. Apenas administradores podem
            excluir informações; qualquer usuário pode adicionar e editar.
          </p>
        </div>
        <Link
          href="/usuarios/new"
          className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Novo usuário
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {users.map((user) => {
          const isSelf = user.id === session.userId;
          const nextRole: Role = user.role === "ADMIN" ? "MEMBRO" : "ADMIN";
          const toggleRole = updateUserRoleAction.bind(null, user.id, nextRole);
          const deleteUser = deleteUserAction.bind(null, user.id);
          return (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900 dark:text-stone-100">
                  {user.name}
                  {isSelf && (
                    <span className="ml-2 text-xs font-normal text-stone-400 dark:text-slate-500">
                      (você)
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-stone-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    user.role === "ADMIN"
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300"
                      : "bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {ROLE_LABELS[user.role as Role] ?? user.role}
                </span>
                <form action={toggleRole}>
                  <button
                    type="submit"
                    className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-800"
                  >
                    {user.role === "ADMIN" ? "Remover admin" : "Tornar admin"}
                  </button>
                </form>
                <ConfirmDeleteForm
                  action={deleteUser}
                  confirmMessage={`Excluir o usuário ${user.name}?`}
                  label="Excluir"
                  variant="link"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
