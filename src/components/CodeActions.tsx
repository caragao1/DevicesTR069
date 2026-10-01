"use client";

import { useState } from "react";

const buttonClass =
  "rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900";

// Nome de arquivo seguro a partir do título do script
function toFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "script"}.js`;
}

export function CodeActions({
  code,
  title,
  disabled = false,
}: {
  code: string;
  title: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = toFileName(title);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={copy} disabled={disabled} className={buttonClass}>
        {copied ? "Copiado!" : "Copiar código"}
      </button>
      <button type="button" onClick={download} disabled={disabled} className={buttonClass}>
        Baixar .js
      </button>
    </div>
  );
}
