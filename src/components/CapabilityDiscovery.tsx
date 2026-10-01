"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  connectAcsAction,
  discoverDevicesPageAction,
  registerCapabilityBySerialAction,
} from "@/lib/actions/capabilities";
import type { DiscoveredDevice } from "@/lib/acs-client";
import { capabilityKey } from "@/lib/capability-key";

const inputClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900";
const primaryButtonClass =
  "rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500";
const secondaryButtonClass =
  "rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-900";

// Teto de segurança: se a API ignorar a paginação, a varredura não roda para sempre.
const MAX_PAGES = 2000;
const REGISTER_CONCURRENCY = 2;

type Combo = {
  key: string;
  manufacturer: string;
  modelName: string;
  hardware: string;
  firmwareVersion: string;
  count: number;
  onlineCount: number;
  // SN escolhido para consultar: online e com inform mais recente
  serialNumber: string;
  serialOnline: boolean;
  serialLastInform: string | null;
};

type RowStatus =
  | { state: "running" }
  | { state: "ok"; id: string; created: boolean }
  | { state: "error"; message: string };

function isBetterSerial(device: DiscoveredDevice, combo: Combo): boolean {
  if (device.online !== combo.serialOnline) return device.online;
  return (device.lastInform ?? "") > (combo.serialLastInform ?? "");
}

export function CapabilityDiscovery({
  initialDomain,
  registeredKeys,
}: {
  initialDomain: string | null;
  registeredKeys: string[];
}) {
  const [domain, setDomain] = useState<string | null>(initialDomain);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [phase, setPhase] = useState<"idle" | "scanning" | "scanned" | "registering">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [devicesRead, setDevicesRead] = useState(0);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [incomplete, setIncomplete] = useState<DiscoveredDevice[]>([]);
  const [registered, setRegistered] = useState(() => new Set(registeredKeys));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [onlyNew, setOnlyNew] = useState(true);
  const stopRef = useRef(false);

  function needsLogin(message: string) {
    setDomain(null);
    setConnectError(message);
  }

  // onSubmit (e não action=) para o React não limpar os campos se a conexão falhar
  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setConnecting(true);
    setConnectError(null);
    const result = await connectAcsAction(
      String(formData.get("domain") ?? ""),
      String(formData.get("clientId") ?? ""),
      String(formData.get("clientSecret") ?? "")
    );
    setConnecting(false);
    if (result.ok) setDomain(result.domain);
    else setConnectError(result.error);
  }

  async function scan() {
    stopRef.current = false;
    setPhase("scanning");
    setError(null);
    setPagesRead(0);
    setDevicesRead(0);
    setRowStatus({});

    const byKey = new Map<string, Combo>();
    const missing: DiscoveredDevice[] = [];
    const seen = new Set<string>();
    let total = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (stopRef.current) break;
      const result = await discoverDevicesPageAction(page);
      if (!result.ok) {
        setError(result.error);
        if (result.needsLogin) needsLogin(result.error);
        break;
      }

      let fresh = 0;
      for (const device of result.devices) {
        if (seen.has(device.serialNumber)) continue;
        seen.add(device.serialNumber);
        fresh++;
        const { manufacturer, modelName, hardware, firmwareVersion } = device;
        if (!manufacturer || !modelName || !hardware || !firmwareVersion) {
          missing.push(device);
          continue;
        }
        const key = capabilityKey({ manufacturer, modelName, hardware, firmwareVersion });
        const combo = byKey.get(key);
        if (!combo) {
          byKey.set(key, {
            key,
            manufacturer,
            modelName,
            hardware,
            firmwareVersion,
            count: 1,
            onlineCount: device.online ? 1 : 0,
            serialNumber: device.serialNumber,
            serialOnline: device.online,
            serialLastInform: device.lastInform,
          });
          continue;
        }
        combo.count++;
        if (device.online) combo.onlineCount++;
        if (isBetterSerial(device, combo)) {
          combo.serialNumber = device.serialNumber;
          combo.serialOnline = device.online;
          combo.serialLastInform = device.lastInform;
        }
      }

      total += fresh;
      setPagesRead(page);
      setDevicesRead(total);
      // Página só com SNs já vistos: a API está repetindo — evita laço infinito.
      if (!result.hasNextPage || (result.devices.length > 0 && fresh === 0)) break;
    }

    const list = [...byKey.values()].sort(
      (a, b) =>
        a.manufacturer.localeCompare(b.manufacturer) ||
        a.modelName.localeCompare(b.modelName) ||
        a.hardware.localeCompare(b.hardware) ||
        a.firmwareVersion.localeCompare(b.firmwareVersion)
    );
    setCombos(list);
    setIncomplete(missing);
    setSelected(new Set(list.filter((c) => !registered.has(c.key)).map((c) => c.key)));
    setPhase("scanned");
  }

  async function registerSelected() {
    stopRef.current = false;
    setPhase("registering");
    setError(null);
    const queue = combos.filter(
      (c) => selected.has(c.key) && rowStatus[c.key]?.state !== "ok"
    );

    const worker = async () => {
      while (queue.length && !stopRef.current) {
        const combo = queue.shift()!;
        setRowStatus((prev) => ({ ...prev, [combo.key]: { state: "running" } }));
        const result = await registerCapabilityBySerialAction(combo.serialNumber);
        if (result.ok) {
          setRowStatus((prev) => ({
            ...prev,
            [combo.key]: { state: "ok", id: result.id, created: result.created },
          }));
          setRegistered((prev) => new Set(prev).add(combo.key));
        } else {
          setRowStatus((prev) => ({
            ...prev,
            [combo.key]: { state: "error", message: result.error },
          }));
          if (result.needsLogin) {
            stopRef.current = true;
            setError(result.error);
            needsLogin(result.error);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: REGISTER_CONCURRENCY }, worker));
    setPhase("scanned");
  }

  const newCount = combos.filter((c) => !registered.has(c.key)).length;
  const visible = onlyNew
    ? combos.filter((c) => !registered.has(c.key) || rowStatus[c.key])
    : combos;
  const selectedPending = combos.filter(
    (c) => selected.has(c.key) && rowStatus[c.key]?.state !== "ok"
  ).length;
  const doneCount = Object.values(rowStatus).filter((s) => s.state === "ok").length;
  const failedCount = Object.values(rowStatus).filter((s) => s.state === "error").length;
  const busy = phase === "scanning" || phase === "registering";

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!domain) {
    return (
      <form onSubmit={connect} className="flex max-w-xl flex-col gap-4">
        <p className="text-sm text-stone-600 dark:text-slate-400">
          Conecte-se ao ACS do cliente. O token fica salvo (criptografado) e é
          o mesmo usado em &quot;Registrar equipamento&quot;; o client_secret
          não é armazenado.
        </p>
        {connectError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {connectError}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Domínio do ACS *</span>
          <input name="domain" required placeholder="https://acs.seudominio.com.br" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Client ID *</span>
          <input name="clientId" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Client secret *</span>
          <input type="password" name="clientSecret" required className={inputClass} />
        </label>
        <button type="submit" disabled={connecting} className={`self-start ${primaryButtonClass}`}>
          {connecting ? "Conectando..." : "Conectar"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm dark:border-teal-900 dark:bg-teal-950">
        <span className="text-teal-800 dark:text-teal-300">
          Conectado a <strong>{domain}</strong>
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => needsLogin("")}
          className="rounded-md border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-900"
        >
          Trocar domínio
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={scan} disabled={busy} className={primaryButtonClass}>
          {phase === "idle" ? "Ler base do ACS" : "Ler base novamente"}
        </button>
        {busy && (
          <button type="button" onClick={() => (stopRef.current = true)} className={secondaryButtonClass}>
            Parar
          </button>
        )}
        {phase !== "idle" && (
          <span className="text-sm text-stone-600 dark:text-slate-400">
            {pagesRead} página(s) · {devicesRead} equipamento(s) lido(s)
            {phase === "scanning" && " — lendo..."}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {(phase === "scanned" || phase === "registering") && (
        <>
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              ["Combinações encontradas", combos.length],
              ["Novas (não registradas)", newCount],
              ["Registradas agora", doneCount],
              ["Com falha", failedCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <dt className="text-xs text-stone-500 dark:text-slate-400">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
              <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
              Mostrar só as combinações novas
            </label>
            <button
              type="button"
              onClick={registerSelected}
              disabled={busy || selectedPending === 0}
              className={primaryButtonClass}
            >
              {phase === "registering"
                ? "Registrando..."
                : `Consultar e registrar ${selectedPending} selecionada(s)`}
            </button>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
              {combos.length === 0
                ? "Nenhum equipamento com fabricante, modelo, hardware e firmware informados."
                : "Todas as combinações encontradas já estão registradas."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">
                      <span className="sr-only">Selecionar</span>
                    </th>
                    <th className="px-3 py-2">Fabricante / modelo</th>
                    <th className="px-3 py-2">Hardware</th>
                    <th className="px-3 py-2">Firmware</th>
                    <th className="px-3 py-2">Na base</th>
                    <th className="px-3 py-2">SN consultado</th>
                    <th className="px-3 py-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((combo) => {
                    const status = rowStatus[combo.key];
                    const isRegistered = registered.has(combo.key);
                    return (
                      <tr key={combo.key} className="border-b border-stone-100 last:border-0 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(combo.key)}
                            disabled={busy || status?.state === "ok"}
                            onChange={() => toggle(combo.key)}
                            aria-label={`Selecionar ${combo.manufacturer} ${combo.modelName}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-stone-900 dark:text-stone-100">{combo.manufacturer}</span>{" "}
                          {combo.modelName}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{combo.hardware}</td>
                        <td className="px-3 py-2 font-mono text-xs">{combo.firmwareVersion}</td>
                        <td className="px-3 py-2 text-xs text-stone-600 dark:text-slate-400">
                          {combo.count} ({combo.onlineCount} online)
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {combo.serialNumber}
                          {!combo.serialOnline && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">(offline)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {status?.state === "running" ? (
                            <span className="text-stone-500">consultando...</span>
                          ) : status?.state === "ok" ? (
                            <Link
                              href={`/capacidades/registro/${status.id}`}
                              className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                            >
                              {status.created ? "Registrado" : "Atualizado"} →
                            </Link>
                          ) : status?.state === "error" ? (
                            <span className="text-red-700 dark:text-red-400">{status.message}</span>
                          ) : isRegistered ? (
                            <span className="text-stone-500 dark:text-slate-400">Já registrado</span>
                          ) : (
                            <span className="font-medium text-amber-700 dark:text-amber-400">Novo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {incomplete.length > 0 && (
            <details className="rounded-xl border border-stone-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer font-medium text-stone-700 dark:text-stone-200">
                {incomplete.length} equipamento(s) ignorado(s) por falta de fabricante, modelo,
                hardware ou firmware na base
              </summary>
              <ul className="mt-3 flex flex-col gap-1 font-mono text-xs text-stone-600 dark:text-slate-400">
                {incomplete.slice(0, 100).map((device) => (
                  <li key={device.serialNumber}>
                    {device.serialNumber} — {device.manufacturer ?? "?"} {device.modelName ?? "?"} · hw{" "}
                    {device.hardware ?? "?"} · fw {device.firmwareVersion ?? "?"}
                  </li>
                ))}
                {incomplete.length > 100 && <li>... e mais {incomplete.length - 100}</li>}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
