"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  executarOperacaoAction,
  prepararOperacaoAction,
  type ExecucaoState,
  type OperacaoBase,
  type OperacaoState,
} from "@/lib/actions/olts";
import { CampoForm, inputClass, type Opcoes } from "@/components/olt/CampoForm";
import type { Campo } from "@/lib/olt/tipos";

// Toda escrita na OLT passa por aqui: o formulário gera a prévia dos comandos
// (nada é enviado), o usuário confere e só então executa.

const botaoPrimario =
  "rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500";
const botaoPerigo =
  "rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500";
const botaoSecundario =
  "rounded-md border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-700 dark:text-stone-200 dark:hover:bg-slate-800";

function AvisoNaoHomologado() {
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      O comando desta operação ainda <strong>não foi validado</strong> neste modelo de OLT. Confira a prévia com atenção; se a
      OLT recusar, a sequência para e o erro fica no histórico.
    </p>
  );
}

export function OperacaoFlow({
  oltId,
  base,
  voltar,
  campos = [],
  opcoes = {},
  valoresIniciais = {},
  modoScript = false,
  avisoNaoHomologado = false,
  demo = false,
  rotuloPrevia = "Gerar prévia dos comandos",
}: {
  oltId: string;
  base: OperacaoBase;
  voltar: string;
  campos?: Campo[];
  opcoes?: Opcoes;
  valoresIniciais?: Record<string, unknown>;
  modoScript?: boolean;
  avisoNaoHomologado?: boolean;
  demo?: boolean;
  rotuloPrevia?: string;
}) {
  const [previaState, preparar, preparando] = useActionState<OperacaoState, FormData>(
    prepararOperacaoAction.bind(null, oltId, base),
    { etapa: "form" }
  );
  const [execState, executar, executando] = useActionState<ExecucaoState, FormData>(
    executarOperacaoAction.bind(null, oltId, voltar),
    {}
  );
  // "Voltar e editar" descarta a prévia atual; a próxima resposta da ação é outro objeto e volta a ser exibida.
  const [descartada, setDescartada] = useState<OperacaoState | null>(null);
  const [edicoes, setEdicoes] = useState(0);
  const emPrevia = previaState.etapa === "previa" && previaState !== descartada;
  const valores = previaState.valores ?? valoresIniciais;
  const erros = previaState.etapa === "form" ? previaState.erros ?? {} : {};

  if (emPrevia && previaState.etapa === "previa") {
    return (
      <div className="flex flex-col gap-4">
        {previaState.naoHomologado && <AvisoNaoHomologado />}
        {demo && (
          <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-600 dark:bg-slate-800 dark:text-slate-300">
            OLT de demonstração: os comandos são aceitos, mas nenhum equipamento é alterado.
          </p>
        )}
        <p className="text-sm text-stone-600 dark:text-slate-300">
          Estes comandos serão enviados à OLT, nesta ordem. Senhas aparecem mascaradas.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-stone-100">
          {previaState.comandos.join("\n")}
        </pre>
        {execState.erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{execState.erro}</p>
        )}
        <form action={executar} className="flex flex-col gap-4">
          <input type="hidden" name="operacao" value={previaState.operacao} />
          <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-200">
            <input type="checkbox" name="salvar" defaultChecked className="mt-0.5" />
            <span>
              Salvar a configuração na OLT ao final (<code>save</code>). Sem isso, a alteração se perde se a OLT reiniciar.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={executando} className={botaoPerigo}>
              {executando ? "Executando…" : "Executar na OLT"}
            </button>
            {(campos.length > 0 || modoScript) && (
              <button
                type="button"
                onClick={() => {
                  setDescartada(previaState);
                  setEdicoes((n) => n + 1);
                }}
                className={botaoSecundario}
              >
                Voltar e editar
              </button>
            )}
            <Link href={voltar} className={botaoSecundario}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form key={edicoes} action={preparar} className="flex flex-col gap-5">
      {avisoNaoHomologado && <AvisoNaoHomologado />}
      {erros._geral && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erros._geral.join(" ")}</p>
      )}
      {Object.keys(erros).some((k) => k !== "_geral") && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <strong>Corrija os campos:</strong>
          <ul className="mt-1 list-disc pl-5">
            {Object.entries(erros)
              .filter(([k]) => k !== "_geral")
              .flatMap(([, lista]) => lista)
              .map((e) => (
                <li key={e}>{e}</li>
              ))}
          </ul>
        </div>
      )}
      {modoScript ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Comandos (um por linha)</span>
          <textarea
            name="comandos"
            rows={10}
            defaultValue={String(valores.comandos ?? "")}
            placeholder={"interface gpon 1\nshow ont-info 1 all\nexit"}
            className={`${inputClass} font-mono`}
          />
        </label>
      ) : (
        campos.length > 0 && <CampoForm campos={campos} valores={valores} opcoes={opcoes} erros={erros} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={preparando} className={botaoPrimario}>
          {preparando ? "Gerando…" : rotuloPrevia}
        </button>
        <Link href={voltar} className={botaoSecundario}>
          Cancelar
        </Link>
        <span className="text-xs text-stone-500 dark:text-slate-400">Nada é enviado à OLT nesta etapa.</span>
      </div>
    </form>
  );
}
