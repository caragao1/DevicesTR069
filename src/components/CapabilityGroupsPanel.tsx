"use client";

import { useState } from "react";
import { summarizeCapabilities, type CapabilityGroupSummary } from "@/lib/capability-summary";
import { ChevronRightIcon } from "@/components/icons";

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function SupportPill({ supported }: { supported: boolean }) {
  return (
    <span
      className={
        supported
          ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500 dark:bg-slate-800 dark:text-slate-400"
      }
    >
      {supported ? "Suportado" : "Não suportado"}
    </span>
  );
}

function DetailRow({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  if (isPlainObject(value)) {
    return (
      <div style={{ paddingLeft: depth * 14 }} className={depth > 0 ? "mt-2" : ""}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
          {humanizeKey(label)}
        </p>
        <div className="mt-1">
          {Object.entries(value).map(([key, child]) => (
            <DetailRow key={key} label={key} value={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ paddingLeft: depth * 14 }}
      className="flex items-center justify-between gap-3 border-b border-stone-100 py-1.5 text-sm last:border-0 dark:border-slate-800"
    >
      <span className="text-stone-700 dark:text-slate-300">{humanizeKey(label)}</span>
      {typeof value === "boolean" ? (
        <SupportPill supported={value} />
      ) : (
        <span className="shrink-0 text-xs text-stone-500 dark:text-slate-400">
          {value === null || value === undefined ? "—" : String(value)}
        </span>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: CapabilityGroupSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-2.5 p-4 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif text-[15px] font-semibold text-stone-900 dark:text-stone-100">
            {group.groupLabel}
          </span>
          <ChevronRightIcon
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform dark:text-slate-500 ${
              open ? "rotate-90" : ""
            }`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {group.headline.map((h) => (
            <div key={h.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-stone-700 dark:text-slate-300">{h.label}</span>
              <SupportPill supported={h.supported} />
            </div>
          ))}
        </div>
      </button>
      {open && isPlainObject(group.raw) && (
        <div className="border-t border-stone-100 px-4 py-3 dark:border-slate-800">
          {Object.entries(group.raw).map(([key, value]) => (
            <DetailRow key={key} label={key} value={value} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CapabilityGroupsPanel({
  capabilities,
}: {
  capabilities: Record<string, unknown>;
}) {
  const groups = summarizeCapabilities(capabilities);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-slate-400">
        Nenhuma informação de capacidade retornada pela API.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.key} group={group} />
      ))}
    </div>
  );
}
