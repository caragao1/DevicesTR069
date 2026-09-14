"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ManufacturerIcon } from "@/components/ManufacturerIcon";
import { CapabilityGroupsPanel } from "@/components/CapabilityGroupsPanel";
import { ChevronRightIcon } from "@/components/icons";

export type CapabilityRecordSummary = {
  id: string;
  manufacturer: string;
  modelName: string;
  hardware: string;
  firmwareVersion: string;
  updatedAt: string;
  capabilities: Record<string, unknown>;
};

const selectClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-teal-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200 dark:disabled:bg-slate-800";

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

// Lista de itens do relatório: fica só na sessão do navegador (sessionStorage),
// sem exigir login. Segue o mesmo padrão de store externo do ThemeToggle:
// gravação vai direto pro storage + notifica os assinantes, sem setState em
// efeito.
const REPORT_STORAGE_KEY = "capacidades-relatorio";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedList: string[] = [];

function readReportList(): string[] {
  try {
    const raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    cachedList = raw ? (JSON.parse(raw) as string[]) : [];
    return cachedList;
  } catch {
    return cachedList;
  }
}

function writeReportList(next: string[]) {
  cachedList = next;
  cachedRaw = JSON.stringify(next);
  try {
    sessionStorage.setItem(REPORT_STORAGE_KEY, cachedRaw);
  } catch {
    // sessionStorage indisponível (modo privado, etc.) — só não persiste.
  }
  listeners.forEach((listener) => listener());
}

function addToReport(id: string) {
  const current = readReportList();
  if (!current.includes(id)) writeReportList([...current, id]);
}

function removeFromReport(id: string) {
  writeReportList(readReportList().filter((x) => x !== id));
}

function subscribeReportList(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getServerReportList(): string[] {
  return [];
}

export function CapacidadesExplorer({
  records,
  initial,
}: {
  records: CapabilityRecordSummary[];
  initial?: {
    manufacturer?: string;
    modelName?: string;
    hardware?: string;
    firmwareVersion?: string;
  };
}) {
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer ?? "");
  const [modelName, setModelName] = useState(initial?.modelName ?? "");
  const [hardware, setHardware] = useState(initial?.hardware ?? "");
  const [firmwareVersion, setFirmwareVersion] = useState(initial?.firmwareVersion ?? "");
  const [reportOpen, setReportOpen] = useState(false);

  const reportList = useSyncExternalStore(
    subscribeReportList,
    readReportList,
    getServerReportList
  );

  const manufacturers = useMemo(
    () => uniqueSorted(records.map((r) => r.manufacturer)),
    [records]
  );

  const models = useMemo(
    () =>
      manufacturer
        ? uniqueSorted(
            records.filter((r) => r.manufacturer === manufacturer).map((r) => r.modelName)
          )
        : [],
    [records, manufacturer]
  );
  // Deriva o valor efetivo direto no render (sem efeito): se só existe uma
  // opção, ela já aparece selecionada — menos cliques no caso comum.
  const effectiveModelName = modelName || (models.length === 1 ? models[0] : "");

  const hardwares = useMemo(
    () =>
      manufacturer && effectiveModelName
        ? uniqueSorted(
            records
              .filter((r) => r.manufacturer === manufacturer && r.modelName === effectiveModelName)
              .map((r) => r.hardware)
          )
        : [],
    [records, manufacturer, effectiveModelName]
  );
  const effectiveHardware = hardware || (hardwares.length === 1 ? hardwares[0] : "");

  const firmwares = useMemo(
    () =>
      manufacturer && effectiveModelName && effectiveHardware
        ? uniqueSorted(
            records
              .filter(
                (r) =>
                  r.manufacturer === manufacturer &&
                  r.modelName === effectiveModelName &&
                  r.hardware === effectiveHardware
              )
              .map((r) => r.firmwareVersion)
          )
        : [],
    [records, manufacturer, effectiveModelName, effectiveHardware]
  );
  const effectiveFirmwareVersion =
    firmwareVersion || (firmwares.length === 1 ? firmwares[0] : "");

  const selectedRecord = useMemo(() => {
    if (!manufacturer || !effectiveModelName || !effectiveHardware || !effectiveFirmwareVersion) {
      return null;
    }
    return (
      records.find(
        (r) =>
          r.manufacturer === manufacturer &&
          r.modelName === effectiveModelName &&
          r.hardware === effectiveHardware &&
          r.firmwareVersion === effectiveFirmwareVersion
      ) ?? null
    );
  }, [records, manufacturer, effectiveModelName, effectiveHardware, effectiveFirmwareVersion]);

  function handleManufacturerChange(value: string) {
    setManufacturer(value);
    setModelName("");
    setHardware("");
    setFirmwareVersion("");
  }
  function handleModelChange(value: string) {
    setModelName(value);
    setHardware("");
    setFirmwareVersion("");
  }
  function handleHardwareChange(value: string) {
    setHardware(value);
    setFirmwareVersion("");
  }

  const reportRecords = reportList
    .map((id) => records.find((r) => r.id === id))
    .filter((r): r is CapabilityRecordSummary => Boolean(r));
  const inReport = selectedRecord ? reportList.includes(selectedRecord.id) : false;

  return (
    <div className="flex flex-col gap-6">
      {/* Barra do relatório */}
      <div className="rounded-xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setReportOpen((o) => !o)}
          disabled={reportRecords.length === 0}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
        >
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
            Relatório:{" "}
            <span className="font-semibold text-stone-900 dark:text-stone-50">
              {reportRecords.length} equipamento{reportRecords.length === 1 ? "" : "s"}
            </span>{" "}
            selecionado{reportRecords.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-3">
            {reportRecords.length > 0 && (
              <Link
                href={`/capacidades/relatorio?ids=${reportRecords.map((r) => r.id).join(",")}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                Gerar relatório em PDF
              </Link>
            )}
            {reportRecords.length > 0 && (
              <ChevronRightIcon
                className={`h-4 w-4 text-stone-400 transition-transform dark:text-slate-500 ${
                  reportOpen ? "rotate-90" : ""
                }`}
              />
            )}
          </div>
        </button>
        {reportOpen && reportRecords.length > 0 && (
          <ul className="flex flex-col gap-1 border-t border-stone-100 px-4 py-3 dark:border-slate-800">
            {reportRecords.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 text-sm text-stone-700 dark:text-slate-300"
              >
                <span>
                  {r.manufacturer} {r.modelName} · {r.firmwareVersion}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromReport(r.id)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Seletores em cascata */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Fabricante</span>
          <select
            className={selectClass}
            value={manufacturer}
            onChange={(e) => handleManufacturerChange(e.target.value)}
          >
            <option value="">Selecione…</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Modelo</span>
          <select
            className={selectClass}
            value={effectiveModelName}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={!manufacturer}
          >
            <option value="">Selecione…</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Hardware</span>
          <select
            className={selectClass}
            value={effectiveHardware}
            onChange={(e) => handleHardwareChange(e.target.value)}
            disabled={!effectiveModelName}
          >
            <option value="">Selecione…</option>
            {hardwares.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-200">Firmware</span>
          <select
            className={selectClass}
            value={effectiveFirmwareVersion}
            onChange={(e) => setFirmwareVersion(e.target.value)}
            disabled={!effectiveHardware}
          >
            <option value="">Selecione…</option>
            {firmwares.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Resultado */}
      {selectedRecord ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
                <ManufacturerIcon manufacturer={selectedRecord.manufacturer} className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
                  {selectedRecord.manufacturer} {selectedRecord.modelName}
                </h2>
                <p className="text-sm text-stone-500 dark:text-slate-400">
                  {selectedRecord.hardware} · {selectedRecord.firmwareVersion}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/capacidades/registro/${selectedRecord.id}`}
                className="rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-slate-800 dark:text-stone-200 dark:hover:bg-slate-800"
              >
                Link permanente
              </Link>
              <button
                type="button"
                onClick={() =>
                  inReport ? removeFromReport(selectedRecord.id) : addToReport(selectedRecord.id)
                }
                className={
                  inReport
                    ? "rounded-md border border-teal-700 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-950"
                    : "rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                }
              >
                {inReport ? "Adicionado ao relatório ✓" : "Adicionar ao relatório"}
              </button>
            </div>
          </div>
          <CapabilityGroupsPanel capabilities={selectedRecord.capabilities} />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">
          Escolha fabricante, modelo, hardware e firmware para ver as capacidades.
        </p>
      )}
    </div>
  );
}
