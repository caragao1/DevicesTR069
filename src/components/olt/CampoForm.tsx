"use client";

import { useState } from "react";
import type { Campo } from "@/lib/olt/tipos";

// Formulário montado a partir dos Campos que o driver do agente declara
// (tipos, faixas, ajuda, listas, campos condicionais). Os nomes dos inputs
// seguem o que src/lib/olt/formulario.ts espera: listas usam nome__índice__sub.

export const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

export type Opcoes = Record<string, [string, string][]>;

function rotulo(campo: Campo) {
  return campo.rotulo || campo.nome.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function valorTexto(valor: unknown) {
  return valor === null || valor === undefined ? "" : String(valor);
}

function Entrada({
  campo,
  nome,
  valor,
  opcoes,
  onChange,
}: {
  campo: Campo;
  nome: string;
  valor: unknown;
  opcoes: Opcoes;
  onChange?: (valor: string) => void;
}) {
  const lista = campo.tipo === "escolha" ? campo.opcoes.map((o) => [o, o] as [string, string]) : campo.origem ? opcoes[campo.origem] ?? [] : null;
  const padrao = valorTexto(valor);
  if (lista) {
    const temValorFora = padrao && !lista.some(([v]) => v === padrao);
    return (
      <select name={nome} defaultValue={padrao} className={inputClass} onChange={(e) => onChange?.(e.target.value)}>
        <option value="">{campo.obrigatorio ? "Selecione…" : "(nenhum)"}</option>
        {lista.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
        {temValorFora && <option value={padrao}>{padrao}</option>}
      </select>
    );
  }
  return (
    <input
      name={nome}
      type={campo.tipo === "senha" ? "password" : campo.tipo === "int" ? "number" : "text"}
      defaultValue={padrao}
      min={campo.minimo ?? undefined}
      max={campo.maximo ?? undefined}
      autoComplete={campo.tipo === "senha" ? "new-password" : "off"}
      className={inputClass}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function Erros({ erros }: { erros?: string[] }) {
  if (!erros?.length) return null;
  return (
    <>
      {erros.map((e) => (
        <span key={e} className="text-xs text-red-600 dark:text-red-400">
          {e}
        </span>
      ))}
    </>
  );
}

function CampoLista({
  campo,
  valor,
  opcoes,
  erros,
}: {
  campo: Campo;
  valor: unknown;
  opcoes: Opcoes;
  erros?: string[];
}) {
  const iniciais = Array.isArray(valor) && valor.length ? (valor as Record<string, unknown>[]) : [{}];
  const [linhas, setLinhas] = useState(() => iniciais.map((item, i) => ({ chave: i, item })));
  const [proxima, setProxima] = useState(iniciais.length);

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
        {rotulo(campo)} {campo.obrigatorio && <span className="text-red-600">*</span>}
      </span>
      {campo.ajuda && <span className="-mt-1 text-xs text-stone-500 dark:text-slate-400">{campo.ajuda}</span>}
      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {campo.subcampos.map((sub) => (
                <th key={sub.nome} className="px-2 py-1.5 font-medium" title={sub.ajuda || undefined}>
                  {rotulo(sub)}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ chave, item }) => (
              <tr key={chave} className="border-t border-stone-100 dark:border-slate-800">
                {campo.subcampos.map((sub) => (
                  <td key={sub.nome} className="px-2 py-1.5">
                    <Entrada
                      campo={sub}
                      nome={`${campo.nome}__${chave}__${sub.nome}`}
                      valor={item[sub.nome] ?? sub.padrao}
                      opcoes={opcoes}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setLinhas((atual) => atual.filter((l) => l.chave !== chave))}
                    className="rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    aria-label="Remover linha"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => {
          setLinhas((atual) => [...atual, { chave: proxima, item: {} }]);
          setProxima((n) => n + 1);
        }}
        className="self-start rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-200 dark:hover:bg-slate-800"
      >
        + Adicionar linha
      </button>
      <Erros erros={erros} />
    </div>
  );
}

function condicaoAtendida(mostrarSe: string, valores: Record<string, string>) {
  if (!mostrarSe) return true;
  const [campo, aceitos] = mostrarSe.split("=");
  return aceitos.split(",").includes(valores[campo] ?? "");
}

export function CampoForm({
  campos,
  valores = {},
  opcoes = {},
  erros = {},
}: {
  campos: Campo[];
  valores?: Record<string, unknown>;
  opcoes?: Opcoes;
  erros?: Record<string, string[]>;
}) {
  // Valores atuais dos campos usados em condições (ex.: wan_modo), para
  // mostrar PPPoE só quando o modo for PPPoE.
  const observados = new Set(campos.map((c) => c.mostrar_se.split("=")[0]).filter(Boolean));
  const [atuais, setAtuais] = useState<Record<string, string>>(() =>
    Object.fromEntries([...observados].map((n) => [n, valorTexto(valores[n] ?? campos.find((c) => c.nome === n)?.padrao)]))
  );

  return (
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      {campos.map((campo, indice) => {
        const visivel = condicaoAtendida(campo.mostrar_se, atuais);
        const novoGrupo = campo.grupo && campo.grupo !== campos[indice - 1]?.grupo;
        const cabecalho =
          novoGrupo ? (
            <h3
              key={`g-${campo.grupo}`}
              className="mt-2 border-b border-stone-200 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500 sm:col-span-2 dark:border-slate-800 dark:text-slate-400"
            >
              {campo.grupo}
            </h3>
          ) : null;
        if (campo.tipo === "lista") {
          return [cabecalho, <CampoLista key={campo.nome} campo={campo} valor={valores[campo.nome]} opcoes={opcoes} erros={erros[campo.nome]} />];
        }
        const faixa =
          campo.tipo === "int" && !campo.origem && (campo.minimo !== null || campo.maximo !== null)
            ? `Faixa: ${campo.minimo ?? "…"} a ${campo.maximo ?? "…"}`
            : "";
        return [
          cabecalho,
          <label key={campo.nome} className={`flex flex-col gap-1 text-sm ${visivel ? "" : "hidden"}`}>
            <span className="font-medium text-stone-700 dark:text-stone-200">
              {rotulo(campo)} {campo.obrigatorio && <span className="text-red-600">*</span>}
            </span>
            <Entrada
              campo={campo}
              nome={campo.nome}
              valor={valores[campo.nome] ?? campo.padrao}
              opcoes={opcoes}
              onChange={observados.has(campo.nome) ? (v) => setAtuais((a) => ({ ...a, [campo.nome]: v })) : undefined}
            />
            {(campo.ajuda || faixa) && (
              <span className="text-xs text-stone-500 dark:text-slate-400">
                {campo.ajuda}
                {campo.ajuda && faixa ? " · " : ""}
                {faixa}
              </span>
            )}
            <Erros erros={erros[campo.nome]} />
          </label>,
        ];
      })}
    </div>
  );
}
