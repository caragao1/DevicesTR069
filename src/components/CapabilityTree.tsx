function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function CapabilityLeaf({ label, value }: { label: string; value: unknown }) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
        <span className="text-stone-700 dark:text-slate-300">{humanizeKey(label)}</span>
        <span
          className={
            value
              ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500 dark:bg-slate-800 dark:text-slate-400"
          }
        >
          {value ? "Suportado" : "Não suportado"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
      <span className="text-stone-700 dark:text-slate-300">{humanizeKey(label)}</span>
      <span className="shrink-0 text-xs text-stone-500 dark:text-slate-400">
        {value === null || value === undefined ? "—" : String(value)}
      </span>
    </div>
  );
}

function CapabilityGroup({ label, value }: { label: string; value: unknown }) {
  if (!isPlainObject(value)) {
    return <CapabilityLeaf label={label} value={value} />;
  }

  const entries = Object.entries(value);
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
        {humanizeKey(label)}
      </p>
      <div className="mt-1 pl-3">
        {entries.map(([key, child]) =>
          isPlainObject(child) ? (
            <CapabilityGroup key={key} label={key} value={child} />
          ) : (
            <CapabilityLeaf key={key} label={key} value={child} />
          )
        )}
      </div>
    </div>
  );
}

export function CapabilityTree({ capabilities }: { capabilities: Record<string, unknown> }) {
  const groups = Object.entries(capabilities);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-slate-400">
        Nenhuma informação de capacidade retornada pela API.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(([groupKey, groupValue]) => (
        <div
          key={groupKey}
          className="rounded-xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-1 font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
            {humanizeKey(groupKey)}
          </h3>
          {isPlainObject(groupValue) ? (
            Object.entries(groupValue).map(([key, child]) =>
              isPlainObject(child) ? (
                <CapabilityGroup key={key} label={key} value={child} />
              ) : (
                <CapabilityLeaf key={key} label={key} value={child} />
              )
            )
          ) : (
            <CapabilityLeaf label={groupKey} value={groupValue} />
          )}
        </div>
      ))}
    </div>
  );
}
