import { prisma } from "@/lib/prisma";
import { ACAO_ROTULO } from "@/lib/olt/rotulos";

// Mostra o resultado de uma operação recém-executada (?resultado=<id> na URL).
export async function ResultadoOperacao({ id, oltId }: { id?: string | string[]; oltId: string }) {
  if (typeof id !== "string") return null;
  const op = await prisma.oltOperacao.findFirst({ where: { id, oltId } });
  if (!op) return null;
  const titulo = `${ACAO_ROTULO[op.acao] ?? op.acao}${op.alvo ? ` · ${op.alvo}` : ""}`;
  return op.sucesso ? (
    <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      <strong>{titulo}:</strong> executado com sucesso.
    </div>
  ) : (
    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <strong>{titulo}:</strong> a OLT recusou. {op.erro}
      <span className="block text-xs opacity-80">Comandos anteriores ao erro já tinham sido aceitos e não são desfeitos.</span>
    </div>
  );
}
