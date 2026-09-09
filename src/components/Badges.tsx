import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type Category,
  type LimitationStatus,
  type Severity,
} from "@/lib/constants";

const SEVERITY_STYLES: Record<Severity, { pill: string; dot: string }> = {
  CRITICA: {
    pill: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    dot: "bg-red-600 dark:bg-red-400",
  },
  ALTA: {
    pill: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    dot: "bg-orange-600 dark:bg-orange-400",
  },
  MEDIA: {
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  BAIXA: {
    pill: "bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-stone-500 dark:bg-slate-400",
  },
};

const STATUS_STYLES: Record<LimitationStatus, { pill: string; dot: string }> =
  {
    CONHECIDO: {
      pill: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      dot: "bg-blue-600 dark:bg-blue-400",
    },
    EM_ANALISE: {
      pill: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      dot: "bg-amber-600 dark:bg-amber-400",
    },
    RESOLVIDO: {
      pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      dot: "bg-emerald-600 dark:bg-emerald-400",
    },
  };

function Pill({
  className,
  dotClassName,
  children,
}: {
  className: string;
  dotClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {dotClassName && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      )}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles = SEVERITY_STYLES[severity];
  return (
    <Pill className={styles.pill} dotClassName={styles.dot}>
      {SEVERITY_LABELS[severity]}
    </Pill>
  );
}

export function StatusBadge({ status }: { status: LimitationStatus }) {
  const styles = STATUS_STYLES[status];
  return (
    <Pill className={styles.pill} dotClassName={styles.dot}>
      {STATUS_LABELS[status]}
    </Pill>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Pill className="bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300">
      {CATEGORY_LABELS[category]}
    </Pill>
  );
}
