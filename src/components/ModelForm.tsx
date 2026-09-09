import { ManufacturerSelect } from "@/components/ManufacturerSelect";

const inputClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

export function ModelForm({
  action,
  manufacturers,
  defaultValues,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  manufacturers: string[];
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
        <span className="font-medium text-stone-700 dark:text-stone-200">
          Fabricante *
        </span>
        <ManufacturerSelect
          manufacturers={manufacturers}
          defaultValue={defaultValues?.manufacturer}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-200">
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
        <span className="font-medium text-stone-700 dark:text-stone-200">
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
        className="self-start rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {submitLabel}
      </button>
    </form>
  );
}
