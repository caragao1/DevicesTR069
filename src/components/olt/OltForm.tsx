"use client";

import { useState } from "react";
import type { Olt } from "@prisma/client";
import { inputClass } from "@/components/olt/CampoForm";
import { PORTA_PADRAO, type Protocolo } from "@/lib/olt/rotulos";

function Rotulo({ children, obrigatorio = false }: { children: React.ReactNode; obrigatorio?: boolean }) {
  return (
    <span className="font-medium text-stone-700 dark:text-stone-200">
      {children} {obrigatorio && <span className="text-red-600">*</span>}
    </span>
  );
}

const ajuda = "text-xs text-stone-500 dark:text-slate-400";

export function OltForm({
  action,
  drivers,
  olt,
  error,
  erroCatalogo,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  drivers: { chave: string; rotulo: string }[];
  olt?: Omit<Olt, "senhaEncrypted">;
  error?: string;
  erroCatalogo?: string | null;
  submitLabel: string;
}) {
  const [protocolo, setProtocolo] = useState<Protocolo>((olt?.protocolo as Protocolo) ?? "ssh");
  const [porta, setPorta] = useState(String(olt?.porta ?? PORTA_PADRAO.ssh));

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <Rotulo obrigatorio>Nome</Rotulo>
          <input name="nome" required defaultValue={olt?.nome} placeholder="Ex.: POP Centro" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <Rotulo obrigatorio>Fabricante / modelo (driver)</Rotulo>
          {drivers.length ? (
            <select name="driver" required defaultValue={olt?.driver ?? drivers[0].chave} className={inputClass}>
              {drivers.map((d) => (
                <option key={d.chave} value={d.chave}>
                  {d.rotulo}
                </option>
              ))}
            </select>
          ) : (
            <input name="driver" required defaultValue={olt?.driver ?? "hsgq"} className={inputClass} />
          )}
          <span className={ajuda}>
            {erroCatalogo
              ? `Lista de drivers indisponível (${erroCatalogo}). Digite a chave do driver, ex.: hsgq.`
              : "Driver homologado que sabe falar com este equipamento. “Demonstração” funciona sem OLT."}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <Rotulo>Modelo (texto livre)</Rotulo>
          <input name="modelo" defaultValue={olt?.modelo ?? ""} placeholder="Ex.: G002 2 PON" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <Rotulo>Localização</Rotulo>
          <input name="localizacao" defaultValue={olt?.localizacao ?? ""} placeholder="Ex.: Rack 2, POP Centro" className={inputClass} />
        </label>
      </div>

      <fieldset className="grid gap-4 rounded-xl border border-stone-200 p-4 sm:grid-cols-4 dark:border-slate-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">Acesso</legend>
        <label className="flex flex-col gap-1 text-sm">
          <Rotulo obrigatorio>Protocolo</Rotulo>
          <select
            name="protocolo"
            value={protocolo}
            onChange={(e) => {
              const novo = e.target.value as Protocolo;
              // Troca a porta junto se ela ainda for a padrão do protocolo anterior.
              if (porta === String(PORTA_PADRAO[protocolo]) || !porta) setPorta(String(PORTA_PADRAO[novo]));
              setProtocolo(novo);
            }}
            className={inputClass}
          >
            <option value="ssh">SSH</option>
            <option value="telnet">Telnet</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <Rotulo obrigatorio>IP ou hostname</Rotulo>
          <input name="host" required defaultValue={olt?.host} placeholder="10.0.0.10" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <Rotulo obrigatorio>Porta</Rotulo>
          <input name="porta" type="number" min={1} max={65535} required value={porta} onChange={(e) => setPorta(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <Rotulo obrigatorio>Usuário</Rotulo>
          <input name="usuario" required defaultValue={olt?.usuario} autoComplete="off" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <Rotulo obrigatorio={!olt}>Senha</Rotulo>
          <input name="senha" type="password" required={!olt} autoComplete="new-password" className={inputClass} />
          <span className={ajuda}>Guardada criptografada.{olt ? " Deixe em branco para manter a atual." : ""}</span>
        </label>
        <p className={`${ajuda} sm:col-span-4`}>
          {protocolo === "telnet"
            ? "Telnet envia usuário e senha sem criptografia: use só em rede de gerência isolada."
            : "SSH é cifrado e recomendado. Algumas OLTs usam porta alternativa (ex.: 2222)."}
        </p>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <Rotulo>Observações</Rotulo>
        <textarea name="observacoes" rows={3} defaultValue={olt?.observacoes ?? ""} className={inputClass} />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
        <input type="checkbox" name="monitorar" defaultChecked={olt?.monitorar ?? true} />
        Incluir na coleta periódica (monitoramento)
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
