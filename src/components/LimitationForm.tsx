import {
  CATEGORIES,
  CATEGORY_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

export function LimitationForm({
  action,
  defaultValues,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: {
    title?: string;
    category?: string;
    severity?: string;
    description?: string;
    affectedFirmware?: string | null;
    workaround?: string | null;
    status?: string;
    referenceLink?: string | null;
  };
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Título *
        </span>
        <input
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder="Ex: Wi-Fi 5GHz desconecta com muitos clientes"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Categoria *
          </span>
          <select
            name="category"
            required
            defaultValue={defaultValues?.category ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Severidade *
          </span>
          <select
            name="severity"
            required
            defaultValue={defaultValues?.severity ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione
            </option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Status
          </span>
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "CONHECIDO"}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Descrição *
        </span>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={defaultValues?.description}
          placeholder="Descreva o comportamento observado, em quais condições ocorre, etc."
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Firmware(s) afetado(s)
        </span>
        <input
          name="affectedFirmware"
          defaultValue={defaultValues?.affectedFirmware ?? ""}
          placeholder="Ex: >= 1.2.3 e < 1.5.0, ou lista de versões"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Workaround / contorno
        </span>
        <textarea
          name="workaround"
          rows={3}
          defaultValue={defaultValues?.workaround ?? ""}
          placeholder="Existe alguma forma de contornar o problema? (opcional)"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Link de referência
        </span>
        <input
          name="referenceLink"
          type="url"
          defaultValue={defaultValues?.referenceLink ?? ""}
          placeholder="https://... (chamado, ticket, documentação do fabricante)"
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
