// Tipo de operação de um script da biblioteca. Mantido como String no banco
// e validado em app code, como as demais constantes (ver src/lib/constants.ts).
export const SCRIPT_OPERATIONS = [
  "SET_PARAMS",
  "SET_URL",
  "DELETE",
  "OUTRO",
] as const;

export type ScriptOperation = (typeof SCRIPT_OPERATIONS)[number];

export const SCRIPT_OPERATION_LABELS: Record<ScriptOperation, string> = {
  SET_PARAMS: "Setar parâmetros",
  SET_URL: "Reapontar URL do ACS",
  DELETE: "Excluir dispositivos",
  OUTRO: "Outro",
};

export function isScriptOperation(value: string): value is ScriptOperation {
  return (SCRIPT_OPERATIONS as readonly string[]).includes(value);
}

export const PARAM_TYPES = [
  "xsd:string",
  "xsd:unsignedInt",
  "xsd:int",
  "xsd:boolean",
  "xsd:dateTime",
  "xsd:base64",
] as const;

export type ParamType = (typeof PARAM_TYPES)[number];
