import type { Catalogo } from "@/lib/olt/tipos";

export function opcoesDeDriver(catalogo: Catalogo | null) {
  return (catalogo?.drivers ?? []).map((d) => ({ chave: d.chave, rotulo: `${d.fabricante} — ${d.modelos.join(", ")}` }));
}

export function rotuloDoDriver(catalogo: Catalogo | null, chave: string) {
  const d = catalogo?.drivers.find((x) => x.chave === chave);
  return d ? `${d.fabricante} — ${d.modelos.join(", ")}` : chave;
}
