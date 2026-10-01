"use client";

import { useActionState, useState } from "react";
import { CodeActions } from "@/components/CodeActions";
import { CsvPreview } from "@/components/CsvPreview";
import type { ScriptFormState } from "@/lib/actions/scripts";
import {
  PARAM_TYPES,
  SCRIPT_OPERATIONS,
  SCRIPT_OPERATION_LABELS,
  type ParamType,
  type ScriptOperation,
} from "@/lib/script-constants";
import {
  defaultConfig,
  generateScript,
  isGeneratorOperation,
  requiredDataModel,
  validateConfig,
  type GeneratorConfig,
  type GeneratorOperation,
  type ParamRow,
} from "@/lib/script-generator";

const inputClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";
const labelClass = "font-medium text-stone-700 dark:text-stone-200";
const smallButtonClass =
  "rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-40 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800";

type Mode = "gerador" | "codigo";

export type ScriptEditorDefaults = {
  title: string;
  description: string;
  operation: ScriptOperation;
  code: string;
  config: GeneratorConfig | null;
};

export function ScriptEditor({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ScriptFormState, formData: FormData) => Promise<ScriptFormState>;
  defaults: ScriptEditorDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [operation, setOperation] = useState<ScriptOperation>(defaults.operation);
  const [mode, setMode] = useState<Mode>(
    defaults.config || !defaults.code ? "gerador" : "codigo"
  );
  const [title, setTitle] = useState(defaults.title);
  const [code, setCode] = useState(defaults.code);
  // um config por operação, para trocar de operação sem perder o que foi preenchido
  const [configs, setConfigs] = useState<Record<GeneratorOperation, GeneratorConfig>>(() => ({
    SET_PARAMS: defaultConfig("SET_PARAMS"),
    SET_URL: defaultConfig("SET_URL"),
    DELETE: defaultConfig("DELETE"),
    ...(defaults.config ? { [defaults.config.operation]: defaults.config } : {}),
  }));

  const usesGenerator = isGeneratorOperation(operation) && mode === "gerador";
  const config = isGeneratorOperation(operation) ? configs[operation] : null;
  const errors = config ? validateConfig(config) : [];
  const generated = config && !errors.length ? generateScript(config) : "";
  const currentCode = usesGenerator ? generated : code;

  function updateConfig(patch: Partial<GeneratorConfig>) {
    if (!config) return;
    setConfigs((prev) => ({
      ...prev,
      [config.operation]: { ...prev[config.operation], ...patch } as GeneratorConfig,
    }));
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (next === "codigo") {
      // leva o código gerado para edição manual (o config deixa de valer)
      if (generated) setCode(generated);
    } else if (
      code.trim() &&
      code !== generated &&
      !window.confirm(
        "Voltar ao assistente descarta o código editado à mão e usa o script gerado pelo formulário. Continuar?"
      )
    ) {
      return;
    }
    setMode(next);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className={labelClass}>Título *</span>
          <input
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Huawei — WAN Remote Access (IPs de gerência)"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className={labelClass}>Descrição</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={defaults.description}
            placeholder="Para que serve, quando usar, cuidados (opcional)"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className={labelClass}>Operação *</span>
          <select
            name="operation"
            value={operation}
            onChange={(event) => setOperation(event.target.value as ScriptOperation)}
            className={inputClass}
          >
            {SCRIPT_OPERATIONS.map((op) => (
              <option key={op} value={op}>
                {SCRIPT_OPERATION_LABELS[op]}
              </option>
            ))}
          </select>
        </label>
        {isGeneratorOperation(operation) && (
          <div className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Como montar o script</span>
            <div className="flex rounded-md border border-stone-200 p-0.5 dark:border-slate-700">
              {(
                [
                  ["gerador", "Assistente"],
                  ["codigo", "Código à mão"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  className={
                    mode === value
                      ? "flex-1 rounded bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white dark:bg-teal-600"
                      : "flex-1 rounded px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-slate-800"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {usesGenerator && config ? (
        <>
          <input type="hidden" name="config" value={JSON.stringify(config)} />
          <GeneratorFields config={config} update={updateConfig} />
          {errors.length > 0 && (
            <ul className="list-disc rounded-md bg-amber-50 py-2 pl-8 pr-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {usesGenerator ? "Script gerado" : "Código do script *"}
          </h2>
          <CodeActions code={currentCode} title={title} disabled={!currentCode} />
        </div>
        {usesGenerator ? (
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-stone-100">
            {generated || "// Corrija os campos acima para gerar o script."}
          </pre>
        ) : (
          <textarea
            name="code"
            required
            rows={24}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            placeholder="Cole aqui o script (.js) que roda no console do painel do ACS"
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
        )}
        <p className="text-xs text-stone-500 dark:text-slate-400">
          Rode no console do navegador (F12) com o painel do ACS aberto e logado.
          Comece sempre com <code>DRY_RUN = true</code>.
        </p>
      </div>

      <CsvPreview snColumn={usesGenerator && config ? config.snColumn : ""} />

      <button
        type="submit"
        disabled={pending || (usesGenerator && errors.length > 0)}
        className="self-start rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

function GeneratorFields({
  config,
  update,
}: {
  config: GeneratorConfig;
  update: (patch: Partial<GeneratorConfig>) => void;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {config.operation === "SET_PARAMS" && (
        <ParamsTable params={config.params} onChange={(params) => update({ params })} />
      )}

      {config.operation === "SET_URL" && (
        <div className="grid gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>URL nova (TO_URL) *</span>
            <input
              value={config.toUrl}
              onChange={(event) => update({ toUrl: event.target.value })}
              placeholder="http://acs.exemplo.com.br:80/tr069"
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Só reapontar quem está em (FROM_URL)</span>
            <textarea
              rows={3}
              value={config.fromUrls.join("\n")}
              onChange={(event) => update({ fromUrls: event.target.value.split("\n") })}
              placeholder={"http://172.16.6.30:8282/acs\n(uma por linha — vazio = qualquer URL)"}
              className={`${inputClass} font-mono`}
            />
            <span className="text-xs text-stone-500 dark:text-slate-400">
              A comparação ignora maiúsculas, barra final e porta padrão (:80 em
              http, :443 em https). O caminho usa o data model de cada device
              ({"<dataModel>"}.ManagementServer.URL).
            </span>
          </label>
        </div>
      )}

      {config.operation === "DELETE" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <strong>Irreversível.</strong> O script exclui do ACS todo SN da lista,
          sem checar URL nem estado. Monte a lista só com quem já aparece no ACS
          novo — um CPE apagado antes de migrar se reinforma e volta &quot;limpo&quot;,
          sem provisionamento.
        </p>
      )}

      <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={config.dryRun}
            onChange={(event) => update({ dryRun: event.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className={labelClass}>DRY_RUN</span> — só gera o relatório,
            não {config.operation === "DELETE" ? "exclui" : "envia"} nada.
            {!config.dryRun && (
              <span className="ml-1 font-semibold text-red-700 dark:text-red-400">
                Desligado: o script age de verdade assim que você escolher o CSV.
              </span>
            )}
          </span>
        </label>
        {config.operation !== "DELETE" && (
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={config.onlyOnline}
              onChange={(event) => update({ onlyOnline: event.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className={labelClass}>ONLY_ONLINE</span> — pula quem está
              offline e lista para rodar de novo depois.
            </span>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className={labelClass}>Concorrência (devices em paralelo)</span>
          <input
            type="number"
            min={1}
            max={50}
            value={Number.isNaN(config.concurrency) ? "" : config.concurrency}
            onChange={(event) => update({ concurrency: event.target.valueAsNumber })}
            className={inputClass}
          />
        </label>
        {config.operation === "SET_PARAMS" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Pausa entre parâmetros (ms)</span>
            <input
              type="number"
              min={0}
              step={500}
              value={Number.isNaN(config.delayMs) ? "" : config.delayMs}
              onChange={(event) => update({ delayMs: event.target.valueAsNumber })}
              className={inputClass}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className={labelClass}>Coluna do SN no CSV</span>
          <input
            value={config.snColumn}
            onChange={(event) => update({ snColumn: event.target.value })}
            placeholder="vazio = detecta (sn, serial, número de série)"
            className={inputClass}
          />
          <span className="text-xs text-stone-500 dark:text-slate-400">
            Nome do cabeçalho ou índice (0 = primeira coluna).
          </span>
        </label>
      </div>
    </div>
  );
}

function ParamsTable({
  params,
  onChange,
}: {
  params: ParamRow[];
  onChange: (params: ParamRow[]) => void;
}) {
  const dataModel = requiredDataModel(params);

  function setRow(index: number, patch: Partial<ParamRow>) {
    onChange(params.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, delta: number) {
    const next = [...params];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Parâmetros (enviados nesta ordem)
        </h3>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          O ACS aceita um parâmetro por requisição: cada linha vira um PATCH
          (uma sessão CWMP), com a pausa abaixo entre eles no mesmo device.
          {dataModel &&
            ` Data model exigido: ${dataModel} (${dataModel === "Device" ? "TR-181" : "TR-098"}) — devices de outro data model são pulados.`}
        </p>
      </div>
      {params.map((param, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-lg border border-stone-100 p-3 sm:grid-cols-[1fr_12rem_10rem_auto] dark:border-slate-800"
        >
          <input
            value={param.path}
            onChange={(event) => setRow(index, { path: event.target.value })}
            placeholder="InternetGatewayDevice.Services.X_HUAWEI_WANRemoteAccess.IPAddress1"
            aria-label={`Caminho do parâmetro ${index + 1}`}
            className={`${inputClass} font-mono text-xs`}
          />
          <input
            value={param.value}
            onChange={(event) => setRow(index, { value: event.target.value })}
            placeholder="valor"
            aria-label={`Valor do parâmetro ${index + 1}`}
            className={`${inputClass} font-mono text-xs`}
          />
          <select
            value={param.type}
            onChange={(event) => setRow(index, { type: event.target.value as ParamType })}
            aria-label={`Tipo do parâmetro ${index + 1}`}
            className={inputClass}
          >
            {PARAM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className={smallButtonClass}
              aria-label="Subir"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === params.length - 1}
              className={smallButtonClass}
              aria-label="Descer"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(params.filter((_, i) => i !== index))}
              disabled={params.length === 1}
              className={`${smallButtonClass} text-red-600 dark:text-red-400`}
            >
              Remover
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...params, { path: "", value: "", type: "xsd:string" }])
        }
        className="self-start rounded-md border border-dashed border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800"
      >
        + Adicionar parâmetro
      </button>
    </div>
  );
}
