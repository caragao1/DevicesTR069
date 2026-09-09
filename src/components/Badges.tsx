import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type Category,
  type LimitationStatus,
  type Severity,
} from "@/lib/constants";

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICA:
    "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900",
  ALTA: "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-900",
  MEDIA:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  BAIXA:
    "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
};

const STATUS_STYLES: Record<LimitationStatus, string> = {
  CONHECIDO:
    "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-900",
  EM_ANALISE:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  RESOLVIDO:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
};

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge className={SEVERITY_STYLES[severity]}>
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: LimitationStatus }) {
  return (
    <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
