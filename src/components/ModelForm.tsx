const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

export function ModelForm({
  action,
  defaultValues,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: {
    manufacturer?: string;
    modelName?: string;
    notes?: string | null;
  };
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Fabricante *
        </span>
        <input
          name="manufacturer"
          required
          defaultValue={defaultValues?.manufacturer}
          placeholder="Ex: Huawei"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Modelo *
        </span>
        <input
          name="modelName"
          required
          defaultValue={defaultValues?.modelName}
          placeholder="Ex: EG8145V5"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Observações
        </span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Notas gerais sobre o modelo (opcional)"
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
