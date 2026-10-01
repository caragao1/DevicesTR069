import { summarizeCapabilities } from "@/lib/capability-summary";

// Matriz do relatório comparativo: recursos nas linhas, equipamentos nas
// colunas. As linhas são a união dos recursos de todos os equipamentos (o
// schema varia por fabricante), na ordem em que aparecem.

export type MatrixRecord = {
  id: string;
  manufacturer: string;
  modelName: string;
  hardware: string;
  firmwareVersion: string;
  capabilities: unknown;
};

// true/false = suportado/não suportado; null = o ACS não informou esse grupo
export type MatrixCell = boolean | null;

export type MatrixRow = {
  label: string;
  cells: MatrixCell[];
  // Algum equipamento difere dos demais (considerando todo o relatório)
  differs: boolean;
};

export type MatrixGroup = { key: string; label: string; rows: MatrixRow[] };

export type MatrixColumn = {
  id: string;
  manufacturer: string;
  modelName: string;
  hardware: string;
  firmwareVersion: string;
  supported: number;
  total: number;
};

export type CapabilityMatrix = { columns: MatrixColumn[]; groups: MatrixGroup[] };

// Até quantos equipamentos cabem lado a lado numa A4 deitada
export const MATRIX_COLUMNS_PER_SHEET = 6;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function buildCapabilityMatrix(records: MatrixRecord[]): CapabilityMatrix {
  const summaries = records.map((r) => summarizeCapabilities(asObject(r.capabilities)));

  const groupOrder: { key: string; label: string; items: string[] }[] = [];
  for (const groups of summaries) {
    for (const group of groups) {
      let entry = groupOrder.find((g) => g.key === group.key);
      if (!entry) {
        entry = { key: group.key, label: group.groupLabel, items: [] };
        groupOrder.push(entry);
      }
      for (const item of group.headline) {
        if (!entry.items.includes(item.label)) entry.items.push(item.label);
      }
    }
  }

  const groups: MatrixGroup[] = groupOrder.map((group) => ({
    key: group.key,
    label: group.label,
    rows: group.items.map((label) => {
      const cells = summaries.map((groups): MatrixCell => {
        const item = groups.find((g) => g.key === group.key)?.headline.find((i) => i.label === label);
        return item ? item.supported : null;
      });
      return { label, cells, differs: new Set(cells).size > 1 };
    }),
  }));

  const columns = records.map((r, index) => {
    const items = summaries[index].flatMap((g) => g.headline);
    return {
      id: r.id,
      manufacturer: r.manufacturer,
      modelName: r.modelName,
      hardware: r.hardware,
      firmwareVersion: r.firmwareVersion,
      supported: items.filter((i) => i.supported).length,
      total: items.length,
    };
  });

  return { columns, groups };
}

// Divide as colunas em blocos (uma folha cada), sem perder a posição original
// de cada equipamento — as células de cada linha são indexadas por ela.
export function chunkColumns(count: number, size = MATRIX_COLUMNS_PER_SHEET): number[][] {
  const blocks: number[][] = [];
  for (let start = 0; start < count; start += size) {
    blocks.push(Array.from({ length: Math.min(size, count - start) }, (_, i) => start + i));
  }
  return blocks;
}
