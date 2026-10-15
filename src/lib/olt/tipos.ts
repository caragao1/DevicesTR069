// Formatos devolvidos pelo agente de OLTs (olt-agent/agente.py).

export type Campo = {
  nome: string;
  tipo: "int" | "str" | "senha" | "escolha" | "lista" | "bool";
  obrigatorio: boolean;
  minimo: number | null;
  maximo: number | null;
  opcoes: string[];
  ajuda: string;
  rotulo: string;
  origem: string;
  subcampos: Campo[];
  padrao: string | number | null;
  sem_espacos: boolean;
  grupo: string;
  mostrar_se: string;
};

export type Recurso = {
  chave: string;
  titulo: string;
  descricao: string;
  colunas: [string, string][];
  campos: Campo[];
  secao: string;
  chave_item: string;
  pode_criar: boolean;
  pode_remover: boolean;
  nao_homologado: string[];
};

export type DriverInfo = {
  chave: string;
  fabricante: string;
  modelos: string[];
  acoes_nao_homologadas: string[];
  schema_autorizacao: Campo[];
  recursos: Recurso[];
};

export type Catalogo = {
  versao: string;
  drivers: DriverInfo[];
  textos: {
    onu: { autorizadas: string; pendentes: string; sinal: string };
    glossario: Record<string, string>;
    limites: { critico: number; alerta: number; forte: number };
  };
};

export type ClasseSinal = "bom" | "alerta" | "critico" | "forte" | "offline" | "sem-leitura";

export type Onu = {
  pon: number;
  onu_id: number;
  sn: string;
  nome: string;
  estado: string;
  run_state: string;
  config_state: string;
  match_state: string;
  ultima_queda: string;
  queda_traduzida: string;
  online: boolean;
  rx_dbm: number | null;
  tx_dbm: number | null;
  olt_rx_dbm: number | null;
  temperatura_c: number | null;
  classe_sinal: ClasseSinal;
};

export type DetalhesOnu = {
  sn: string;
  line_profile_id: number | null;
  srv_profile_id: number | null;
  comandos: string[];
};

export type Pendente = Record<string, string | number> & { pon?: number; sn?: string };

export type Item = Record<string, unknown> & { linhas?: string[] };

export type AcaoOperacao = "autorizar" | "desautorizar" | "reiniciar" | "criar" | "remover" | "script";

export type Operacao = {
  acao: AcaoOperacao;
  recurso?: string;
  dados?: Record<string, unknown>;
  pon?: number;
  onu_id?: number;
  item_id?: string;
  comandos?: string[];
};

export type ResultadoExecucao = {
  comandos: string[];
  saidas: string[];
  sucesso: boolean;
  erro: string;
  simulado: boolean;
};
