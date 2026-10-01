// Mesma leitura de CSV dos scripts gerados (fromCsv em script-generator.ts),
// para a pré-visualização na página mostrar exatamente o que o script vai ler.
// Se mudar a regra lá, mude aqui também.

const SN_HEADERS = /^(sn|serial|serial.?number|n[uú]mero.?de.?s[ée]rie)$/i;

const SEPARATOR_LABELS: Record<string, string> = {
  ";": "ponto e vírgula (;)",
  ",": "vírgula (,)",
  "\t": "tab",
  "|": "barra vertical (|)",
};

export type CsvPreview =
  | {
      ok: true;
      separator: string;
      header: string[];
      hasHeader: boolean;
      columnLabel: string;
      sns: string[];
      totalLines: number;
    }
  | { ok: false; error: string };

export function previewCsv(text: string, snColumn: string): CsvPreview {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { ok: false, error: "Arquivo vazio." };

  const separator = [";", ",", "\t", "|"].reduce((best, sep) =>
    lines[0].split(sep).length > lines[0].split(best).length ? sep : best
  );
  const escaped = separator === "\t" ? "\\t" : `\\${separator}`;
  const splitter = new RegExp(`${escaped}(?=(?:[^"]*"[^"]*")*[^"]*$)`);
  const splitLine = (line: string) =>
    line.split(splitter).map((cell) => cell.trim().replace(/^["']|["']$/g, ""));

  const column = snColumn.trim();
  const numericColumn = /^\d+$/.test(column) ? Number(column) : null;
  const header = splitLine(lines[0]);
  const byName = header.findIndex((cell) => SN_HEADERS.test(cell));
  const hasHeader = byName >= 0 || (column !== "" && header.length > 1);
  const describe = () => header.map((cell, index) => `${index}=${cell}`).join(" | ");

  let index = byName >= 0 ? byName : 0;
  if (column !== "") {
    const chosen =
      numericColumn ??
      header.findIndex((cell) => cell.toLowerCase() === column.toLowerCase());
    if (chosen < 0) {
      return { ok: false, error: `Coluna "${column}" não encontrada. Cabeçalho: ${describe()}` };
    }
    index = chosen;
  } else if (byName < 0 && header.length > 1) {
    return {
      ok: false,
      error: `Não identifiquei a coluna do serial number. Preencha a coluna do SN. Cabeçalho: ${describe()}`,
    };
  }

  const values = lines
    .slice(hasHeader ? 1 : 0)
    .map((line) => splitLine(line)[index] ?? "")
    .filter(Boolean);

  return {
    ok: true,
    separator: SEPARATOR_LABELS[separator] ?? separator,
    header,
    hasHeader,
    columnLabel: hasHeader ? header[index] ?? `#${index + 1}` : `#${index + 1}`,
    sns: [...new Set(values)],
    totalLines: lines.length,
  };
}
