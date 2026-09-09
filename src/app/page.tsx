import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SeverityBadge } from "@/components/Badges";
import { SEVERITY_ORDER, type Severity } from "@/lib/constants";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  const models = await prisma.deviceModel.findMany({
    where: query
      ? {
          OR: [
            { manufacturer: { contains: query } },
            { modelName: { contains: query } },
          ],
        }
      : undefined,
    include: {
      limitations: { select: { severity: true } },
    },
    orderBy: [{ manufacturer: "asc" }, { modelName: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Modelos de equipamentos
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Consulte as limitações e problemas conhecidos por fabricante e
          modelo cadastrados no IXC ACS.
        </p>
      </div>

      <form className="flex gap-2" action="/">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Buscar por fabricante ou modelo..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Buscar
        </button>
      </form>

      {models.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {query
            ? "Nenhum modelo encontrado para essa busca."
            : "Nenhum modelo cadastrado ainda."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {models.map((model) => {
            const worst = model.limitations.reduce<Severity | null>(
              (acc, l) => {
                const sev = l.severity as Severity;
                if (!acc) return sev;
                return SEVERITY_ORDER[sev] < SEVERITY_ORDER[acc] ? sev : acc;
              },
              null
            );
            const count = model.limitations.length;
            return (
              <li key={model.id}>
                <Link
                  href={`/models/${model.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {model.manufacturer} {model.modelName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {count === 0
                        ? "Nenhuma limitação registrada"
                        : `${count} limitaç${count === 1 ? "ão" : "ões"} registrada${count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  {worst && <SeverityBadge severity={worst} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
