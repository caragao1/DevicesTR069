import { requireAdmin } from "@/lib/session";
import { createUserAction } from "@/lib/actions/users";
import { UserForm } from "@/components/UserForm";

export default async function NewUserPage({
  searchParams,
}: PageProps<"/usuarios/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Novo usuário
        </h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Crie um acesso para outra pessoa da equipe.
        </p>
      </div>
      <UserForm action={createUserAction} error={error} />
    </div>
  );
}
