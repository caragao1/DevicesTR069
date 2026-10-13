import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { carregarOlt } from "@/lib/olt/paginas";
import { rotuloDoDriver } from "@/lib/olt/drivers";
import { OltTabs, type Aba } from "@/components/olt/OltTabs";
import { StatusOltBadge } from "@/components/olt/Indicadores";
import { ArrowLeftIcon } from "@/components/icons";

export default async function OltLayout({ children, params }: LayoutProps<"/olts/[id]">) {
  const { id } = await params;
  const session = await getSession();
  const { olt, catalogo, driver } = await carregarOlt(id);
  const ultima = await prisma.oltColeta.findFirst({ where: { oltId: id }, orderBy: { createdAt: "desc" } });
  const base = `/olts/${id}`;

  const abas: Aba[] = [
    { href: base, label: "Visão geral" },
    { href: `${base}/onus`, label: "ONUs e sinal", prefixo: true },
    { href: `${base}/pendentes`, label: "Pendentes" },
    ...(driver?.recursos.length ? [{ href: `${base}/recursos/${driver.recursos[0].chave}`, label: "Perfis", ativoEm: `${base}/recursos` }] : []),
    ...(session?.role === "ADMIN" ? [{ href: `${base}/script`, label: "Script / CLI" }] : []),
    { href: `${base}/historico`, label: "Histórico" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/olts" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Todas as OLTs
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">{olt.nome}</h1>
          <StatusOltBadge coleta={ultima} />
        </div>
        <p className="-mt-2 text-sm text-stone-500 dark:text-slate-400">
          {rotuloDoDriver(catalogo, olt.driver)}
          {olt.modelo ? ` · ${olt.modelo}` : ""} · {olt.protocolo.toUpperCase()} {olt.host}:{olt.porta}
        </p>
        <OltTabs abas={abas} />
      </div>
      {children}
    </div>
  );
}
