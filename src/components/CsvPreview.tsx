"use client";

import { useState } from "react";
import { previewCsv } from "@/lib/csv-preview";

// Confere o CSV antes de colar o script no painel: mostra o separador e a
// coluna detectados e quantos SNs o script vai ler. O arquivo só é lido no
// navegador — não é enviado ao servidor.
export function CsvPreview({ snColumn }: { snColumn: string }) {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const result = file ? previewCsv(file.text, snColumn) : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Conferir CSV (opcional)
        </h3>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          Mesma leitura que o script fará no painel. O arquivo é lido só no seu
          navegador e não é enviado.
        </p>
      </div>
      <input
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={async (event) => {
          const selected = event.target.files?.[0];
          setFile(selected ? { name: selected.name, text: await selected.text() } : null);
        }}
        className="text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-stone-200"
      />
      {result && !result.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <div className="flex flex-col gap-2 text-sm text-stone-700 dark:text-stone-200">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-stone-500 dark:text-slate-400">Separador</dt>
            <dd>{result.separator}</dd>
            <dt className="text-stone-500 dark:text-slate-400">Coluna do SN</dt>
            <dd>
              {result.columnLabel}
              {!result.hasHeader && " (sem cabeçalho — a 1ª linha conta como SN)"}
            </dd>
            <dt className="text-stone-500 dark:text-slate-400">SNs únicos</dt>
            <dd className="font-semibold">
              {result.sns.length}{" "}
              <span className="font-normal text-stone-500 dark:text-slate-400">
                ({result.totalLines} linha(s) no arquivo)
              </span>
            </dd>
          </dl>
          {result.sns.length > 0 && (
            <p className="break-all font-mono text-xs text-stone-500 dark:text-slate-400">
              {result.sns.slice(0, 10).join(", ")}
              {result.sns.length > 10 && ", ..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
