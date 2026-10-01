// Gerador dos scripts de operação em massa no ACS (colados no console do
// navegador com o painel do ACS aberto e logado). A página só monta o texto
// do script — não chama o ACS: os endpoints internos (/app/devices/...) só
// funcionam com o cookie de sessão e a mesma origem do próprio painel.
//
// Toda entrada do usuário entra no script via JSON.stringify, para que aspas,
// barras ou quebras de linha não quebrem (nem injetem) código.

import {
  PARAM_TYPES,
  type ParamType,
  type ScriptOperation,
} from "@/lib/script-constants";

export type ParamRow = { path: string; value: string; type: ParamType };

export type CommonConfig = {
  dryRun: boolean;
  concurrency: number;
  // nome do cabeçalho ou índice (0-based); vazio = detecta sozinho
  snColumn: string;
};

export type SetParamsConfig = CommonConfig & {
  operation: "SET_PARAMS";
  params: ParamRow[];
  onlyOnline: boolean;
  delayMs: number;
};

export type SetUrlConfig = CommonConfig & {
  operation: "SET_URL";
  fromUrls: string[];
  toUrl: string;
  onlyOnline: boolean;
};

export type DeleteConfig = CommonConfig & {
  operation: "DELETE";
};

export type GeneratorConfig = SetParamsConfig | SetUrlConfig | DeleteConfig;

export type GeneratorOperation = GeneratorConfig["operation"];

export const GENERATOR_OPERATIONS: GeneratorOperation[] = [
  "SET_PARAMS",
  "SET_URL",
  "DELETE",
];

export function isGeneratorOperation(
  value: ScriptOperation | string
): value is GeneratorOperation {
  return (GENERATOR_OPERATIONS as string[]).includes(value);
}

export function defaultConfig(operation: GeneratorOperation): GeneratorConfig {
  const common: CommonConfig = { dryRun: true, concurrency: 10, snColumn: "" };
  switch (operation) {
    case "SET_PARAMS":
      return {
        ...common,
        operation,
        params: [{ path: "", value: "", type: "xsd:string" }],
        onlyOnline: true,
        delayMs: 5000,
      };
    case "SET_URL":
      return {
        ...common,
        operation,
        fromUrls: [],
        toUrl: "",
        onlyOnline: true,
      };
    case "DELETE":
      return { ...common, operation };
  }
}

const TR069_PATH = /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)+$/;
const INTEGER_TYPES: ParamType[] = ["xsd:unsignedInt", "xsd:int"];

// Os caminhos de um set só valem para um data model: o primeiro segmento
// (InternetGatewayDevice = TR-098, Device = TR-181).
export function requiredDataModel(params: ParamRow[]): string | null {
  const roots = new Set(
    params.map((p) => p.path.trim().split(".")[0]).filter(Boolean)
  );
  if (roots.size !== 1) return null;
  const [root] = roots;
  return root === "InternetGatewayDevice" || root === "Device" ? root : null;
}

export function validateConfig(config: GeneratorConfig): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(config.concurrency) || config.concurrency < 1 || config.concurrency > 50) {
    errors.push("Concorrência deve ser um número inteiro entre 1 e 50.");
  }

  if (config.operation === "SET_PARAMS") {
    if (!config.params.length) errors.push("Adicione ao menos um parâmetro.");
    config.params.forEach((param, index) => {
      const label = `Parâmetro ${index + 1}`;
      if (!TR069_PATH.test(param.path.trim())) {
        errors.push(`${label}: caminho inválido (ex.: InternetGatewayDevice.ManagementServer.URL).`);
      }
      if (!PARAM_TYPES.includes(param.type)) errors.push(`${label}: tipo inválido.`);
      if (INTEGER_TYPES.includes(param.type) && !/^-?\d+$/.test(param.value.trim())) {
        errors.push(`${label}: ${param.type} precisa de um número inteiro.`);
      }
      if (param.type === "xsd:unsignedInt" && param.value.trim().startsWith("-")) {
        errors.push(`${label}: xsd:unsignedInt não aceita número negativo.`);
      }
      if (param.type === "xsd:boolean" && !/^(true|false|0|1)$/.test(param.value.trim())) {
        errors.push(`${label}: xsd:boolean aceita true, false, 1 ou 0.`);
      }
    });
    const roots = new Set(config.params.map((p) => p.path.trim().split(".")[0]));
    if (roots.size > 1) {
      errors.push("Todos os caminhos precisam ser do mesmo data model (InternetGatewayDevice ou Device).");
    }
    if (!Number.isInteger(config.delayMs) || config.delayMs < 0 || config.delayMs > 120000) {
      errors.push("Pausa entre parâmetros deve ficar entre 0 e 120000 ms.");
    }
  }

  if (config.operation === "SET_URL") {
    if (!/^https?:\/\/\S+$/i.test(config.toUrl.trim())) {
      errors.push("URL nova precisa começar com http:// ou https://.");
    }
    config.fromUrls.forEach((url) => {
      if (url.trim() && !/^https?:\/\/\S+$/i.test(url.trim())) {
        errors.push(`URL de origem inválida: "${url}".`);
      }
    });
  }

  return errors;
}

const js = (value: unknown) => JSON.stringify(value);

function paramValue(param: ParamRow): string | number {
  const raw = param.value.trim();
  // inteiros vão como número, como no script que funcionou com o MaskLength
  return INTEGER_TYPES.includes(param.type) ? Number(raw) : raw;
}

function snColumnLiteral(snColumn: string): string {
  const trimmed = snColumn.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return js(trimmed);
}

const CSV_HELPERS = `const SN_HEADERS = /^(sn|serial|serial.?number|n[uú]mero.?de.?s[ée]rie)$/i;

const fromCsv = (text) => {
    const lines = text
        .split(/\\r?\\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.length) return [];

    const separator = [';', ',', '\\t', '|'].reduce((best, sep) =>
        lines[0].split(sep).length > lines[0].split(best).length ? sep : best,
    );
    // ignora separadores dentro de aspas
    const splitLine = (line) =>
        line
            .split(new RegExp(\`\\\\\${separator}(?=(?:[^"]*"[^"]*")*[^"]*$)\`))
            .map((cell) => cell.trim().replace(/^["']|["']$/g, ''));

    const header = splitLine(lines[0]);
    const byName = header.findIndex((cell) => SN_HEADERS.test(cell));
    const hasHeader = byName >= 0 || (SN_COLUMN !== '' && header.length > 1);

    const describe = () => header.map((cell, index) => \`\${index}=\${cell}\`).join(' | ');

    let column = byName >= 0 ? byName : 0;
    if (SN_COLUMN !== '') {
        const chosen = Number.isInteger(SN_COLUMN)
            ? SN_COLUMN
            : header.findIndex((cell) => cell.toLowerCase() === String(SN_COLUMN).toLowerCase());
        if (chosen < 0) throw new Error(\`Coluna "\${SN_COLUMN}" não encontrada. Cabeçalho: \${describe()}\`);
        column = chosen;
    } else if (byName < 0 && header.length > 1) {
        throw new Error(\`Não identifiquei a coluna do serial number. Preencha SN_COLUMN. Cabeçalho: \${describe()}\`);
    }

    console.log(\`Coluna usada: "\${hasHeader ? header[column] : \`#\${column + 1}\`}" — cabeçalho: \${header.join(' | ')}\`);

    const values = lines
        .slice(hasHeader ? 1 : 0)
        .map((line) => splitLine(line)[column] ?? '')
        .filter(Boolean);

    return [...new Set(values)];
};

const pickCsv = () =>
    new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt,text/csv,text/plain';
        input.onchange = async () => {
            const file = input.files?.[0];
            resolve(file ? fromCsv(await file.text()) : []);
        };
        input.click();
    });`;

const LOAD_SNS = `const SNS = await pickCsv();
// const SNS = ['FHTTFE11277B']
console.log(\`\${SNS.length} serial number(s) importado(s):\`, SNS.slice(0, 5), SNS.length > 5 ? '...' : '');`;

const POOL = `const queue = [...SNS];
const started = performance.now();
let done = 0;

await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (queue.length) {
            await handle(queue.shift());
            if (++done % 25 === 0 || !queue.length) console.log(\`... \${done}/\${SNS.length}\`);
        }
    }),
);

console.log(\`----- resumo (\${Math.round(performance.now() - started) / 1000}s) -----\`);`;

const CSV_DOC = ` * Ao colar, abre o seletor de arquivo: escolha o CSV com os serial numbers. A
 * coluna é achada pelo cabeçalho (sn / serial number / número de série); se o
 * cabeçalho for diferente, informe em SN_COLUMN o nome ou o índice da coluna.
 * Para usar uma lista fixa, troque a linha do pickCsv() por:
 *   const SNS = ['ABC123', 'DEF456'];`;

// Cabeçalho do device (GET getWholeDevice) — comum ao set de parâmetros e de URL
const FETCH_DEVICE = `        const response = await fetch(\`/app/devices/\${encodeURIComponent(sn)}/getWholeDevice\`);
        if (!response.ok) {
            console.warn(\`✗ \${sn} — GET device HTTP \${response.status}\`);
            report[response.status === 404 ? 'notFound' : 'failed'].push(sn);
            return;
        }

        const device = await response.json();
        if (!device?.serialNumber) {
            console.warn(\`✗ \${sn} — não encontrado no ACS\`);
            report.notFound.push(sn);
            return;
        }`;

const OFFLINE_CHECK = `        if (ONLY_ONLINE && !device.status) {
            console.log(\`– \${sn} — offline, pulando (rode de novo quando estiver online)\`);
            report.offline.push(sn);
            return;
        }`;

function commonConstants(config: GeneratorConfig, dryRunComment: string): string {
  return `const DRY_RUN = ${config.dryRun}; // ${dryRunComment}`;
}

function generateSetParams(config: SetParamsConfig): string {
  const dataModel = requiredDataModel(config.params);
  const paramLines = config.params
    .map(
      (param) =>
        `    ${js(param.path.trim())}: { value: ${js(paramValue(param))}, type: ${js(param.type)} },`
    )
    .join("\n");

  const modelCheck = dataModel
    ? `
        // os caminhos de PARAMS são ${dataModel === "Device" ? "TR-181" : "TR-098"}; em outro data model não se aplicam
        if (device.dataModel !== DATA_MODEL) {
            console.log(\`– \${sn} — data model "\${device.dataModel}", pulando\`);
            report.wrongModel.push({ sn, dataModel: device.dataModel });
            return;
        }
`
    : "";

  return `/**
 * Define em massa ${config.params.length} parâmetro(s) TR-069. Cole no console do navegador
 * com o painel aberto e logado — usa o cookie de sessão da própria aba.
 *
${CSV_DOC}
 *
 * Só atua nos SNs do CSV. Cada parâmetro vai num PATCH separado (o ACS não
 * aceita vários no mesmo corpo), com DELAY_MS entre eles no mesmo device.
 * Comece com DRY_RUN = true e confira o relatório antes de valer.
 */

const PARAMS = {
${paramLines}
};
${dataModel ? `const DATA_MODEL = ${js(dataModel)};\n` : ""}
${commonConstants(config, "true = só relatório, não envia nada")}
const ONLY_ONLINE = ${config.onlyOnline}; // a task expira em ~1 intervalo periódico; offline vira pendência pra rodar depois
const CONCURRENCY = ${config.concurrency}; // devices em paralelo; cada um vira um connection request no ACS
const DELAY_MS = ${config.delayMs}; // pausa entre um parâmetro e o próximo no MESMO device (cada PATCH vira uma sessão CWMP)
const SN_COLUMN = ${snColumnLiteral(config.snColumn)}; // nome do cabeçalho ou índice (0-based); vazio = detecta sozinho

${CSV_HELPERS}

${LOAD_SNS}
if (DRY_RUN) console.warn('DRY_RUN ligado — nada será enviado aos dispositivos.');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const report = {
    sent: [],
    partial: [],
    offline: [],
    wrongModel: [],
    notFound: [],
    failed: [],
};

// o PATCH responde assim que a task entra na fila do ACS — não espera o CPE
const handle = async (sn) => {
    try {
${FETCH_DEVICE}
${modelCheck}
${OFFLINE_CHECK}

        if (DRY_RUN) {
            console.log(\`· \${sn} — [dry-run] enviaria \${Object.keys(PARAMS).length} parâmetro(s)\`);
            report.sent.push(sn);
            return;
        }

        // um PATCH por parâmetro, em sequência (o ACS não aceita vários no mesmo corpo)
        const entries = Object.entries(PARAMS);
        for (const [index, [path, param]] of entries.entries()) {
            const patch = await fetch(\`/app/devices/treeView/\${encodeURIComponent(sn)}\`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ [path]: param }),
            });

            if (!patch.ok) {
                console.warn(\`✗ \${sn} — PATCH \${path.split('.').pop()} HTTP \${patch.status} \${await patch.text().catch(() => '')}\`);
                // se parou no meio, o device fica com parte dos valores: lista à parte
                (index === 0 ? report.failed : report.partial).push(sn);
                return;
            }

            if (index < entries.length - 1) await sleep(DELAY_MS);
        }

        console.log(\`✓ \${sn} — \${entries.length} parâmetro(s) enviado(s)\`);
        report.sent.push(sn);
    } catch (error) {
        console.warn(\`✗ \${sn} — \${error.message}\`);
        report.failed.push(sn);
    }
};

${POOL}
console.table([
    { situacao: DRY_RUN ? 'seriam alterados' : 'set enviado', total: report.sent.length },
    { situacao: 'parcial (parou no meio)', total: report.partial.length },
    { situacao: 'offline (pendente)', total: report.offline.length },
    { situacao: 'data model diferente', total: report.wrongModel.length },
    { situacao: 'não encontrado no ACS', total: report.notFound.length },
    { situacao: 'falha', total: report.failed.length },
]);
const rerun = [...report.offline, ...report.failed, ...report.partial];
console.log('Pendentes/falhas para reexecutar:', rerun.join('\\n'));
globalThis.copy?.(rerun.join('\\n')); // joga a lista no clipboard
window.__massScriptReport = report;
`;
}

function generateSetUrl(config: SetUrlConfig): string {
  const fromUrls = config.fromUrls.map((url) => url.trim()).filter(Boolean);
  return `/**
 * Reaponta em massa a URL do ACS (ManagementServer.URL). Cole no console do
 * navegador com o painel aberto e logado — usa o cookie de sessão da própria aba.
 *
${CSV_DOC}
 *
 * Só altera quem hoje está em FROM_URL (comparação ignora porta padrão, barra
 * final e maiúsculas). Deixe FROM_URL = [] para alterar todos da lista.
 * Comece com DRY_RUN = true e confira o relatório antes de valer.
 */

const FROM_URL = ${js(fromUrls)}; // só reaponta quem está nesses valores; [] = qualquer
const TO_URL = ${js(config.toUrl.trim())};
${commonConstants(config, "true = só relatório, não envia nada")}
const ONLY_ONLINE = ${config.onlyOnline}; // a task expira em ~1 intervalo periódico; offline vira pendência pra rodar depois
const CONCURRENCY = ${config.concurrency}; // devices em paralelo; cada um vira um connection request no ACS
const SN_COLUMN = ${snColumnLiteral(config.snColumn)}; // nome do cabeçalho ou índice (0-based); vazio = detecta sozinho

${CSV_HELPERS}

// http://host:80/x e http://host/x/ são a mesma URL pro CPE, mas o valor cru difere
const normalizeUrl = (url) =>
    String(url ?? '')
        .trim()
        .toLowerCase()
        .replace(/^(http:\\/\\/[^/]+):80(?=\\/|$)/, '$1')
        .replace(/^(https:\\/\\/[^/]+):443(?=\\/|$)/, '$1')
        .replace(/\\/+$/, '');

const targets = FROM_URL.map(normalizeUrl);
const goal = normalizeUrl(TO_URL);

${LOAD_SNS}
if (DRY_RUN) console.warn('DRY_RUN ligado — nada será enviado aos dispositivos.');

const report = {
    sent: [],
    alreadyOk: [],
    offline: [],
    otherUrl: [],
    notFound: [],
    failed: [],
};

// o PATCH responde assim que a task entra na fila do ACS — não espera o CPE
const handle = async (sn) => {
    try {
${FETCH_DEVICE}

        const current = device.deviceInfo?.pointingUrl || '';
        const dataModel = device.dataModel; // 'InternetGatewayDevice' (TR-098) ou 'Device' (TR-181)

        if (normalizeUrl(current) === goal) {
            console.log(\`– \${sn} — já aponta para \${TO_URL}\`);
            report.alreadyOk.push(sn);
            return;
        }

        if (targets.length && !targets.includes(normalizeUrl(current))) {
            console.log(\`– \${sn} — URL atual fora do filtro: "\${current || '(vazia)'}"\`);
            report.otherUrl.push({ sn, current });
            return;
        }

${OFFLINE_CHECK}

        const path = \`\${dataModel}.ManagementServer.URL\`;
        if (DRY_RUN) {
            console.log(\`· \${sn} — [dry-run] \${path}: "\${current}" → "\${TO_URL}"\`);
            report.sent.push({ sn, path, from: current });
            return;
        }

        const patch = await fetch(\`/app/devices/treeView/\${encodeURIComponent(sn)}\`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ [path]: { value: TO_URL, type: 'xsd:string' } }),
        });

        if (patch.ok) {
            console.log(\`✓ \${sn} — \${path}: "\${current}" → "\${TO_URL}"\`);
            report.sent.push({ sn, path, from: current });
        } else {
            console.warn(\`✗ \${sn} — PATCH HTTP \${patch.status} \${await patch.text().catch(() => '')}\`);
            report.failed.push(sn);
        }
    } catch (error) {
        console.warn(\`✗ \${sn} — \${error.message}\`);
        report.failed.push(sn);
    }
};

${POOL}
console.table([
    { situacao: DRY_RUN ? 'seriam alterados' : 'set enviado', total: report.sent.length },
    { situacao: 'já na URL nova', total: report.alreadyOk.length },
    { situacao: 'offline (pendente)', total: report.offline.length },
    { situacao: 'URL fora do filtro', total: report.otherUrl.length },
    { situacao: 'não encontrado no ACS', total: report.notFound.length },
    { situacao: 'falha', total: report.failed.length },
]);
const rerun = [...report.offline, ...report.failed];
console.log('Pendentes/falhas para reexecutar:', rerun.join('\\n'));
globalThis.copy?.(rerun.join('\\n')); // joga a lista no clipboard
window.__massScriptReport = report;
`;
}

function generateDelete(config: DeleteConfig): string {
  return `/**
 * Exclui em massa TODOS os dispositivos do ACS cujo serial number esteja no CSV.
 * Cole no console do navegador com o painel aberto e logado — usa o cookie de
 * sessão da própria aba.
 *
${CSV_DOC}
 *
 * IRREVERSÍVEL. Não há checagem de URL/estado do dispositivo — exclui todo SN
 * da lista que existir no ACS. Monte a lista só com quem já aparece no ACS novo.
 * Comece com DRY_RUN = true e confira o relatório antes de valer.
 */

${commonConstants(config, "true = só relatório, não exclui nada")}
const CONCURRENCY = ${config.concurrency}; // exclusões em paralelo
const SN_COLUMN = ${snColumnLiteral(config.snColumn)}; // nome do cabeçalho ou índice (0-based); vazio = detecta sozinho

${CSV_HELPERS}

${LOAD_SNS}
if (DRY_RUN) console.warn('DRY_RUN ligado — nada será excluído.');

const report = {
    deleted: [],
    failed: [],
};

const handle = async (sn) => {
    try {
        if (DRY_RUN) {
            console.log(\`· \${sn} — [dry-run] seria excluído\`);
            report.deleted.push(sn);
            return;
        }

        const del = await fetch(\`/app/devices/\${encodeURIComponent(sn)}\`, { method: 'DELETE' });

        if (del.ok) {
            console.log(\`✓ \${sn} — excluído\`);
            report.deleted.push(sn);
        } else {
            console.warn(\`✗ \${sn} — DELETE HTTP \${del.status} \${await del.text().catch(() => '')}\`);
            report.failed.push(sn);
        }
    } catch (error) {
        console.warn(\`✗ \${sn} — \${error.message}\`);
        report.failed.push(sn);
    }
};

${POOL}
console.table([
    { situacao: DRY_RUN ? 'seriam excluídos' : 'excluídos', total: report.deleted.length },
    { situacao: 'falha (inclui não encontrado)', total: report.failed.length },
]);
console.log('Falhas para reexecutar:', report.failed.join('\\n'));
globalThis.copy?.(report.failed.join('\\n')); // joga a lista de falhas no clipboard
window.__massScriptReport = report;
`;
}

export function generateScript(config: GeneratorConfig): string {
  switch (config.operation) {
    case "SET_PARAMS":
      return generateSetParams(config);
    case "SET_URL":
      return generateSetUrl(config);
    case "DELETE":
      return generateDelete(config);
  }
}

// O config vem do banco (JSON) ou de um formulário: só aceita o formato
// esperado, para nunca gerar script a partir de dados malformados.
export function parseConfig(raw: unknown): GeneratorConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.operation !== "string" || !isGeneratorOperation(value.operation)) {
    return null;
  }
  const base = defaultConfig(value.operation);
  const common: CommonConfig = {
    dryRun: typeof value.dryRun === "boolean" ? value.dryRun : base.dryRun,
    concurrency: typeof value.concurrency === "number" ? value.concurrency : base.concurrency,
    snColumn: typeof value.snColumn === "string" ? value.snColumn : base.snColumn,
  };

  switch (value.operation) {
    case "SET_PARAMS": {
      const params = Array.isArray(value.params)
        ? value.params
            .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
            .map((p) => ({
              path: typeof p.path === "string" ? p.path : "",
              value: typeof p.value === "string" ? p.value : String(p.value ?? ""),
              type: PARAM_TYPES.includes(p.type as ParamType)
                ? (p.type as ParamType)
                : "xsd:string",
            }))
        : [];
      return {
        ...common,
        operation: "SET_PARAMS",
        params,
        onlyOnline: typeof value.onlyOnline === "boolean" ? value.onlyOnline : true,
        delayMs: typeof value.delayMs === "number" ? value.delayMs : 5000,
      };
    }
    case "SET_URL":
      return {
        ...common,
        operation: "SET_URL",
        fromUrls: Array.isArray(value.fromUrls)
          ? value.fromUrls
              .filter((url): url is string => typeof url === "string")
              .map((url) => url.trim())
              .filter(Boolean)
          : [],
        toUrl: typeof value.toUrl === "string" ? value.toUrl : "",
        onlyOnline: typeof value.onlyOnline === "boolean" ? value.onlyOnline : true,
      };
    case "DELETE":
      return { ...common, operation: "DELETE" };
  }
}
