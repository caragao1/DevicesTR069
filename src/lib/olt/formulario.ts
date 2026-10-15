import type { Campo } from "@/lib/olt/tipos";

// Converte o FormData de um formulário gerado a partir dos Campos do driver
// (ver components/olt/CampoForm.tsx) em objeto. Listas usam nome__índice__sub.
export function lerDados(campos: Campo[], formData: FormData): Record<string, unknown> {
  const dados: Record<string, unknown> = {};
  for (const campo of campos) {
    if (campo.tipo === "lista") {
      const indices = new Set<number>();
      for (const chave of formData.keys()) {
        const m = chave.match(new RegExp(`^${campo.nome}__(\\d+)__`));
        if (m) indices.add(Number(m[1]));
      }
      dados[campo.nome] = [...indices]
        .sort((a, b) => a - b)
        .map((i) =>
          Object.fromEntries(
            campo.subcampos.map((sub) => [sub.nome, String(formData.get(`${campo.nome}__${i}__${sub.nome}`) ?? "").trim()])
          )
        )
        // Linha nova traz só os valores padrão (ex.: regra "vlan transparent"): conta como vazia.
        .filter((item) =>
          campo.subcampos.some((sub) => item[sub.nome] && item[sub.nome] !== String(sub.padrao ?? ""))
        );
    } else if (campo.tipo === "bool") {
      dados[campo.nome] = formData.get(campo.nome) === "on";
    } else {
      dados[campo.nome] = String(formData.get(campo.nome) ?? "").trim();
    }
  }
  return dados;
}

// "vlan: obrigatória..." → { vlan: [...] }; mensagens sem campo vão para _geral.
export function errosPorCampo(erros: string[]): Record<string, string[]> {
  const resultado: Record<string, string[]> = {};
  for (const erro of erros) {
    const m = erro.match(/^([a-z0-9_]+)(\[|:)/i);
    const chave = m ? m[1] : "_geral";
    (resultado[chave] ??= []).push(erro);
  }
  return resultado;
}

export function origensDosCampos(campos: Campo[]): string[] {
  const origens = new Set<string>();
  for (const campo of campos) {
    if (campo.origem) origens.add(campo.origem);
    for (const sub of campo.subcampos) if (sub.origem) origens.add(sub.origem);
  }
  return [...origens];
}
