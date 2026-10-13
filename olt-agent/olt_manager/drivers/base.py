from dataclasses import dataclass, field


@dataclass
class Campo:
    nome: str
    tipo: str  # int, str, senha, escolha, lista, bool
    obrigatorio: bool = True
    minimo: int | None = None
    maximo: int | None = None
    opcoes: list[str] = field(default_factory=list)
    ajuda: str = ""
    rotulo: str = ""
    origem: str = ""  # chave de um recurso cujos itens viram as opções (ex.: "line")
    subcampos: list["Campo"] = field(default_factory=list)  # para tipo "lista"
    padrao: object = None
    sem_espacos: bool = False
    grupo: str = ""  # agrupa campos em blocos no formulário
    mostrar_se: str = ""  # "outro_campo=valor1,valor2": só exibe quando a condição vale

    @property
    def titulo(self):
        return self.rotulo or self.nome.replace("_", " ").capitalize()


@dataclass
class Recurso:
    """Algo que a OLT gerencia (perfil, VLAN, service-port...), descrito para a interface montar telas sozinha."""

    chave: str
    titulo: str
    descricao: str
    colunas: list[tuple[str, str]]
    campos: list[Campo] = field(default_factory=list)
    secao: str = "Perfis"
    chave_item: str = "id"
    pode_criar: bool = False
    pode_remover: bool = False
    # Operações cujo comando ainda não foi conferido num equipamento real.
    nao_homologado: set[str] = field(default_factory=set)


@dataclass
class ResultadoExecucao:
    comandos: list[str]
    saidas: list[str]
    sucesso: bool
    erro: str = ""
    simulado: bool = False


class ErroValidacao(ValueError):
    pass


class DriverOLT:
    """Interface comum. Para homologar um novo modelo, crie uma subclasse e registre em drivers/__init__.py."""

    fabricante = ""
    modelos: list[str] = []
    porta_padrao = {"ssh": 22, "telnet": 23}
    acoes_nao_homologadas: set[str] = set()

    def __init__(self, host, porta, usuario, senha, timeout=15, protocolo="ssh"):
        self._dados_conexao = dict(
            host=host, porta=porta, usuario=usuario, senha=senha, timeout=timeout
        )
        self.protocolo = protocolo

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.fechar()

    def fechar(self):
        pass

    def conectado(self):
        """True se já há uma sessão aberta e viva com a OLT (permite reaproveitar entre requisições)."""
        return False

    def preparar_reuso(self):
        """Chamado antes de reutilizar o driver: limpa caches e saída pendente."""

    def testar_conexao(self):
        raise NotImplementedError

    def recursos(self) -> dict[str, Recurso]:
        return {}

    def listar(self, recurso):
        raise NotImplementedError

    def gerar_criacao(self, recurso, dados):
        raise NotImplementedError

    def gerar_remocao(self, recurso, item_id):
        raise NotImplementedError

    def schema_autorizacao(self) -> list[Campo]:
        raise NotImplementedError

    def listar_autorizadas(self, pon=None):
        raise NotImplementedError

    def listar_pendentes(self, pon=None):
        raise NotImplementedError

    def sinal(self, pon=None, incluir_olt_rx=True):
        raise NotImplementedError

    def detalhes_onu(self, pon, onu_id):
        return {}

    def gerar_autorizacao(self, dados):
        raise NotImplementedError

    def gerar_desautorizacao(self, pon, onu_id):
        raise NotImplementedError

    def gerar_reinicio(self, pon, onu_id):
        raise NotImplementedError

    def executar(self, comandos, simular=False, salvar=False):
        raise NotImplementedError

    def validar_campos(self, campos, dados):
        erros = []
        for campo in campos:
            erros += _validar_campo(campo, dados.get(campo.nome), campo.nome)
        return erros


def _vazio(valor):
    return valor is None or valor == "" or valor == []


def _validar_campo(campo, valor, caminho):
    if _vazio(valor):
        return [f"{caminho}: obrigatório"] if campo.obrigatorio else []
    erros = []
    if campo.tipo == "int":
        try:
            valor = int(valor)
        except (TypeError, ValueError):
            return [f"{caminho}: deve ser número"]
        if (campo.minimo is not None and valor < campo.minimo) or (
            campo.maximo is not None and valor > campo.maximo
        ):
            erros.append(f"{caminho}: fora da faixa {campo.minimo}-{campo.maximo}")
    elif campo.tipo == "escolha" and campo.opcoes and valor not in campo.opcoes:
        erros.append(f"{caminho}: use {', '.join(campo.opcoes)}")
    elif (
        campo.tipo in ("str", "senha")
        and campo.sem_espacos
        and any(c.isspace() for c in str(valor))
    ):
        erros.append(f"{caminho}: não pode ter espaços")
    elif campo.tipo == "lista":
        if not isinstance(valor, list):
            return [f"{caminho}: formato inválido"]
        for i, item in enumerate(valor, 1):
            for sub in campo.subcampos:
                erros += _validar_campo(
                    sub, item.get(sub.nome), f"{caminho}[{i}].{sub.nome}"
                )
    return erros
