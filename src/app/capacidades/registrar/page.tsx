import { requireSession } from "@/lib/session";
import { getActiveAcsSession } from "@/lib/acs-session";
import { registerEquipmentCapabilityAction, clearAcsSessionAction } from "@/lib/actions/capabilities";

const inputClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

export default async function RegisterCapabilityPage({
  searchParams,
}: PageProps<"/capacidades/registrar">) {
  const session = await requireSession();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const acsSession = await getActiveAcsSession(session.userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Registrar equipamento
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-stone-500 dark:text-slate-400">
          {acsSession
            ? "Informe o número de série do equipamento. Vamos consultar as capacidades suportadas por esse hardware/firmware e salvar apenas o resultado."
            : "Informe o domínio e as credenciais do ACS do cliente e o número de série do equipamento. Vamos consultar as capacidades suportadas por esse hardware/firmware e salvar apenas o resultado — o client_secret não é armazenado."}
        </p>
      </div>

      {acsSession && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm dark:border-teal-900 dark:bg-teal-950">
          <span className="text-teal-800 dark:text-teal-300">
            Conectado a <strong>{acsSession.domain}</strong> · sessão expira às{" "}
            {acsSession.expiresAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <form action={clearAcsSessionAction}>
            <button
              type="submit"
              className="rounded-md border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-900"
            >
              Trocar domínio
            </button>
          </form>
        </div>
      )}

      <form
        action={registerEquipmentCapabilityAction}
        className="flex max-w-xl flex-col gap-4"
      >
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {!acsSession && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700 dark:text-stone-200">
                Domínio do ACS *
              </span>
              <input
                name="domain"
                required
                placeholder="https://acs.seudominio.com.br"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700 dark:text-stone-200">
                Client ID *
              </span>
              <input name="clientId" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-stone-700 dark:text-stone-200">
                Client secret *
              </span>
              <input
                type="password"
                name="clientSecret"
                required
                className={inputClass}
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">
            Número de série do equipamento *
          </span>
          <input name="serialNumber" required className={inputClass} />
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Consultar e registrar
        </button>
      </form>
    </div>
  );
}
