"use client";

import { useState } from "react";

const NEW_OPTION = "__novo_fabricante__";
const inputClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

export function ManufacturerSelect({
  manufacturers,
  defaultValue,
}: {
  manufacturers: string[];
  defaultValue?: string;
}) {
  const [addingNew, setAddingNew] = useState(manufacturers.length === 0);

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <input
          name="manufacturer"
          required
          autoFocus
          defaultValue={
            defaultValue && !manufacturers.includes(defaultValue)
              ? defaultValue
              : undefined
          }
          placeholder="Nome do fabricante"
          className={`flex-1 ${inputClass}`}
        />
        {manufacturers.length > 0 && (
          <button
            type="button"
            onClick={() => setAddingNew(false)}
            className="shrink-0 rounded-md border border-stone-200 px-3 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      name="manufacturer"
      required
      defaultValue={defaultValue ?? ""}
      onChange={(event) => {
        if (event.target.value === NEW_OPTION) setAddingNew(true);
      }}
      className={inputClass}
    >
      <option value="" disabled>
        Selecione um fabricante
      </option>
      {manufacturers.map((manufacturer) => (
        <option key={manufacturer} value={manufacturer}>
          {manufacturer}
        </option>
      ))}
      <option value={NEW_OPTION}>+ Adicionar novo fabricante</option>
    </select>
  );
}
