import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

from olt_manager.conexao import ErroOLT, abrir_sessao
from olt_manager.drivers.base import (
    Campo,
    DriverOLT,
    ErroValidacao,
    Recurso,
    ResultadoExecucao,
)
from olt_manager.drivers.hsgq import parsers
from olt_manager.drivers import textos

__all__ = ["DriverHSGQ", "ErroValidacao"]

PADROES_ERRO = [
    r"There is no matched command",
    r"Unknown command",
    r"Incomplete command",
    r"\bError\b",
    r"\bFailure\b",
    r"\bfailed\b",
    r"already exist",
    r"does not exist",
    r"being used|in use",
]

SCHEMA_AUTORIZACAO = [
    Campo(
        "pon",
        "int",
        minimo=1,
        maximo=16,
        rotulo="PON",
        ajuda="Porta PON da OLT onde a ONU está conectada",
    ),
    Campo(
        "onu_id",
        "int",
        obrigatorio=False,
        minimo=0,
        maximo=127,
        rotulo="ID da ONU",
        ajuda="Vazio usa o próximo ID livre na PON",
    ),
    Campo(
        "sn", "str", rotulo="Serial (SN)", ajuda="Ex.: XPON5259fb4e ou 58504f4e5259fb4e"
    ),
    Campo(
        "line_profile_id",
        "int",
        minimo=0,
        maximo=2047,
        rotulo="Line profile",
        origem="line",
        ajuda=textos.CURTO["line"],
    ),
    Campo(
        "srv_profile_id",
        "int",
        minimo=0,
        maximo=2047,
        rotulo="Service profile",
        origem="srv",
        ajuda=textos.CURTO["srv"],
    ),
    Campo(
        "nome",
        "str",
        obrigatorio=False,
        sem_espacos=True,
        rotulo="Nome",
        ajuda="Identificação do cliente, sem espaços",
    ),
    Campo(
        "descricao",
        "str",
        obrigatorio=False,
        rotulo="Descrição",
        ajuda="Endereço, plano, observações",
    ),
    Campo(
        "wan_modo",
        "escolha",
        obrigatorio=False,
        opcoes=["pppoe", "dhcp", "bridge"],
        rotulo="Modo da WAN",
        ajuda="PPPoE: a ONU disca com usuário/senha. DHCP: recebe IP automático. Bridge: a ONU só repassa a VLAN para o roteador do cliente",
    ),
    Campo(
        "vlan",
        "int",
        obrigatorio=False,
        minimo=1,
        maximo=4094,
        rotulo="VLAN",
        ajuda="VLAN do serviço de internet (obrigatória com WAN)",
    ),
    Campo(
        "pppoe_usuario",
        "str",
        obrigatorio=False,
        sem_espacos=True,
        rotulo="Usuário PPPoE",
    ),
    Campo(
        "pppoe_senha",
        "senha",
        obrigatorio=False,
        sem_espacos=True,
        rotulo="Senha PPPoE",
    ),
    Campo(
        "wifi_24_ssid",
        "str",
        obrigatorio=False,
        sem_espacos=True,
        rotulo="SSID 2.4 GHz",
    ),
    Campo(
        "wifi_5_ssid", "str", obrigatorio=False, sem_espacos=True, rotulo="SSID 5 GHz"
    ),
    Campo(
        "wifi_senha",
        "senha",
        obrigatorio=False,
        sem_espacos=True,
        rotulo="Senha do Wi-Fi",
        ajuda="WPA2, usada nas duas redes",
    ),
    Campo(
        "tr069_profile_id",
        "int",
        obrigatorio=False,
        minimo=1,
        maximo=32,
        rotulo="Perfil TR-069",
        origem="tr069",
        ajuda=textos.CURTO["tr069"],
    ),
    Campo(
        "acesso_remoto_http",
        "int",
        obrigatorio=False,
        minimo=1,
        maximo=65534,
        rotulo="Porta HTTP remota",
        ajuda="Libera a página web da ONU pela WAN nesta porta",
    ),
]

# Organização do formulário de autorização: blocos e campos que só aparecem quando fazem sentido.
_GRUPOS = {
    "Identificação": ["pon", "onu_id", "sn", "nome", "descricao"],
    "Perfis": ["line_profile_id", "srv_profile_id"],
    "Internet (WAN)": ["wan_modo", "vlan", "pppoe_usuario", "pppoe_senha"],
    "Wi-Fi": ["wifi_24_ssid", "wifi_5_ssid", "wifi_senha"],
    "Gerência remota": ["tr069_profile_id", "acesso_remoto_http"],
}
_CONDICOES = {
    "vlan": "wan_modo=pppoe,dhcp,bridge",
    "pppoe_usuario": "wan_modo=pppoe",
    "pppoe_senha": "wan_modo=pppoe",
}
for _campo in SCHEMA_AUTORIZACAO:
    _campo.grupo = next(g for g, nomes in _GRUPOS.items() if _campo.nome in nomes)
    _campo.mostrar_se = _CONDICOES.get(_campo.nome, "")
SCHEMA_AUTORIZACAO.sort(key=lambda c: list(_GRUPOS).index(c.grupo))

RECURSOS = {
    "dba": Recurso(
        "dba",
        "DBA profiles",
        textos.LONGO["dba"],
        colunas=[
            ("id", "ID"),
            ("nome", "Nome"),
            ("tipo", "Tipo"),
            ("parametros_txt", "Banda (kbps)"),
        ],
        campos=[
            Campo(
                "id",
                "int",
                minimo=10,
                maximo=255,
                rotulo="ID",
                ajuda="Os IDs abaixo de 10 são reservados pela OLT",
            ),
            Campo("nome", "str", sem_espacos=True, rotulo="Nome", ajuda="Ex.: 500M"),
            Campo(
                "tipo",
                "escolha",
                opcoes=["type1", "type2", "type3", "type4", "type5"],
                rotulo="Tipo",
                ajuda=textos.CURTO["dba_tipo"],
            ),
            Campo(
                "fix",
                "int",
                obrigatorio=False,
                minimo=128,
                maximo=10000000,
                rotulo="Fix (kbps)",
                ajuda="Banda fixa, sempre reservada (type1 e type5)",
            ),
            Campo(
                "assure",
                "int",
                obrigatorio=False,
                minimo=128,
                maximo=10000000,
                rotulo="Assure (kbps)",
                ajuda="Banda garantida quando pedida (type2, type3, type5)",
            ),
            Campo(
                "max",
                "int",
                obrigatorio=False,
                minimo=128,
                maximo=10000000,
                rotulo="Max (kbps)",
                ajuda="Teto de banda (type3, type4, type5)",
            ),
        ],
        pode_criar=True,
        pode_remover=True,
        nao_homologado={"remover"},
    ),
    "line": Recurso(
        "line",
        "Line profiles",
        textos.LONGO["line"],
        colunas=[
            ("id", "ID"),
            ("nome", "Nome"),
            ("tconts_txt", "T-CONTs"),
            ("gems_txt", "GEM ports"),
            ("mapeamentos_txt", "Mapeamentos"),
        ],
        campos=[
            Campo("id", "int", minimo=0, maximo=2047, rotulo="ID"),
            Campo("nome", "str", sem_espacos=True, rotulo="Nome"),
            Campo(
                "tconts",
                "lista",
                rotulo="T-CONTs",
                ajuda="Cada T-CONT é um contêiner de upload ligado a um DBA profile",
                subcampos=[
                    Campo("tcont", "int", minimo=1, maximo=7, rotulo="T-CONT"),
                    Campo(
                        "dba_profile_id",
                        "int",
                        minimo=0,
                        maximo=255,
                        rotulo="DBA profile",
                        origem="dba",
                    ),
                ],
            ),
            Campo(
                "gems",
                "lista",
                rotulo="GEM ports",
                ajuda="Canais lógicos de tráfego; cada GEM usa um T-CONT",
                subcampos=[
                    Campo("gem", "int", minimo=1, maximo=32, rotulo="GEM"),
                    Campo("tcont", "int", minimo=1, maximo=7, rotulo="T-CONT"),
                ],
            ),
            Campo(
                "mapeamentos",
                "lista",
                rotulo="Mapeamentos",
                ajuda="Que tráfego vai em cada GEM. Ex.: 'vlan transparent' ou 'vlan 100'",
                subcampos=[
                    Campo("gem", "int", minimo=1, maximo=32, rotulo="GEM"),
                    Campo("indice", "int", minimo=1, maximo=8, rotulo="Índice"),
                    Campo("regra", "str", rotulo="Regra", padrao="vlan transparent"),
                ],
            ),
        ],
        pode_criar=True,
        pode_remover=True,
        nao_homologado={"remover"},
    ),
    "srv": Recurso(
        "srv",
        "Service profiles",
        textos.LONGO["srv"],
        colunas=[("id", "ID"), ("nome", "Nome"), ("linhas_txt", "Configuração")],
        campos=[
            Campo("id", "int", minimo=0, maximo=2047, rotulo="ID"),
            Campo("nome", "str", sem_espacos=True, rotulo="Nome"),
            Campo(
                "ont_port_eth",
                "str",
                obrigatorio=False,
                padrao="adaptive",
                rotulo="Portas Ethernet",
                ajuda="Quantidade de portas Ethernet da ONU ou 'adaptive' para detectar sozinho",
            ),
            Campo(
                "portas_vlan",
                "lista",
                obrigatorio=False,
                rotulo="VLAN por porta",
                ajuda="Como cada porta Ethernet trata VLAN",
                subcampos=[
                    Campo("porta", "int", minimo=1, maximo=8, rotulo="Porta eth"),
                    Campo(
                        "regra",
                        "str",
                        rotulo="Regra",
                        padrao="transparent",
                        ajuda="'transparent' repassa tudo; 'translation 100 user-vlan 100' etc.",
                    ),
                ],
            ),
        ],
        pode_criar=True,
        pode_remover=True,
        nao_homologado={"criar", "remover"},
    ),
    "traffic": Recurso(
        "traffic",
        "Traffic profiles",
        textos.LONGO["traffic"],
        colunas=[("id", "ID"), ("nome", "Nome"), ("parametros_txt", "Parâmetros")],
        campos=[
            Campo("id", "int", minimo=1, maximo=32, rotulo="ID"),
            Campo("nome", "str", sem_espacos=True, rotulo="Nome"),
            Campo(
                "cir",
                "int",
                obrigatorio=False,
                minimo=0,
                maximo=10240000,
                rotulo="CIR (kbps)",
                ajuda="Taxa garantida",
            ),
            Campo(
                "pir",
                "int",
                obrigatorio=False,
                minimo=64,
                maximo=10240000,
                rotulo="PIR (kbps)",
                ajuda="Taxa máxima (pico)",
            ),
        ],
        pode_criar=True,
        pode_remover=True,
        nao_homologado={"remover"},
    ),
    "tr069": Recurso(
        "tr069",
        "Perfis TR-069",
        textos.LONGO["tr069"],
        colunas=[
            ("id", "ID"),
            ("nome", "Nome"),
            ("url", "URL do ACS"),
            ("usuario", "Usuário"),
        ],
        campos=[
            Campo("id", "int", minimo=1, maximo=32, rotulo="ID"),
            Campo("nome", "str", sem_espacos=True, rotulo="Nome"),
            Campo(
                "url",
                "str",
                sem_espacos=True,
                rotulo="URL do ACS",
                ajuda="Ex.: http://acs.provedor.com.br:7547",
            ),
            Campo("usuario", "str", sem_espacos=True, rotulo="Usuário do ACS"),
            Campo("senha", "senha", sem_espacos=True, rotulo="Senha do ACS"),
        ],
        pode_criar=True,
        pode_remover=True,
        nao_homologado={"criar", "remover"},
    ),
    "sip": Recurso(
        "sip",
        "Perfis SIP (VoIP)",
        textos.LONGO["sip"],
        colunas=[("id", "ID"), ("nome", "Nome"), ("linhas_txt", "Configuração")],
    ),
}

TEMPLATES = {
    ("criar", "dba"): "dba_profile_criar.j2",
    ("criar", "line"): "line_profile_criar.j2",
    ("criar", "srv"): "srv_profile_criar.j2",
    ("criar", "traffic"): "traffic_profile_criar.j2",
    ("criar", "tr069"): "tr069_profile_criar.j2",
    ("remover", "dba"): "dba_profile_remover.j2",
    ("remover", "line"): "line_profile_remover.j2",
    ("remover", "srv"): "srv_profile_remover.j2",
    ("remover", "traffic"): "traffic_profile_remover.j2",
    ("remover", "tr069"): "tr069_profile_remover.j2",
}


def _resumo(lista, formato):
    return ", ".join(formato.format(**i) for i in lista)


class DriverHSGQ(DriverOLT):
    fabricante = "HSGQ"
    modelos = ["G02 (GPON)"]
    acoes_nao_homologadas = {"reiniciar"}

    def __init__(self, host, porta, usuario, senha, timeout=15, protocolo="ssh"):
        super().__init__(host, porta, usuario, senha, timeout, protocolo)
        self._env = Environment(
            loader=FileSystemLoader(Path(__file__).parent / "templates"),
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self._sessao = None
        self._cache_perfis = None

    def _sessao_aberta(self):
        if self._sessao is None:
            self._sessao = abrir_sessao(
                self.protocolo, padroes_erro=PADROES_ERRO, **self._dados_conexao
            )
            self._sessao.enviar("enable", validar=False)
            self._sessao.enviar("configure", validar=False)
        return self._sessao

    def fechar(self):
        if self._sessao:
            self._sessao.fechar()
            self._sessao = None

    def conectado(self):
        return self._sessao is not None and self._sessao.ativa()

    def preparar_reuso(self):
        self._cache_perfis = None
        if self._sessao:
            self._sessao.descartar_pendente()

    def _consultar(self, comando):
        return self._sessao_aberta().enviar(comando, validar=False)

    def testar_conexao(self):
        self._sessao_aberta()
        return {"mensagem": "Conectado e em modo de configuração"}

    # ONUs

    def schema_autorizacao(self):
        return SCHEMA_AUTORIZACAO

    def schema(self, recurso):
        return (
            SCHEMA_AUTORIZACAO if recurso == "autorizacao" else RECURSOS[recurso].campos
        )

    def listar_autorizadas(self, pon=None):
        comando = f"show ont-info {pon} all" if pon else "show ont-info all"
        return parsers.parse_ont_info(self._consultar(comando))

    def listar_pendentes(self, pon=None):
        comando = f"show ont-autofind {pon}" if pon else "show ont-autofind"
        return [
            _normalizar_pendente(p)
            for p in parsers.parse_ont_autofind(self._consultar(comando))
        ]

    def sinal(self, pon=None, incluir_olt_rx=True):
        dados = parsers.parse_ont_optical(self._consultar("show ont-optical all"))
        dados = [d for d in dados if pon is None or d["pon"] == pon]
        if incluir_olt_rx:
            olt_rx = {}
            for numero in sorted({d["pon"] for d in dados}):
                self._consultar(f"interface gpon {numero}")
                try:
                    for item in parsers.parse_ont_optical(
                        self._consultar("show ont-optical all")
                    ):
                        olt_rx[(item["pon"], item["onu_id"])] = item["olt_rx_dbm"]
                finally:
                    self._consultar("exit")
            for d in dados:
                d["olt_rx_dbm"] = olt_rx.get((d["pon"], d["onu_id"]), d["olt_rx_dbm"])
        return dados

    def config_pons(self):
        return parsers.parse_config_gpon(
            self._consultar("show running-config gpon all")
        )

    def detalhes_onu(self, pon, onu_id):
        pons = self.config_pons()
        return pons.get(pon, {}).get("onus", {}).get(onu_id, {})

    def proximo_id_livre(self, pon):
        usados = {o["onu_id"] for o in self.listar_autorizadas(pon) if o["pon"] == pon}
        for i in range(128):
            if i not in usados:
                return i
        raise ErroValidacao(f"A PON {pon} não tem IDs livres")

    def validar(self, recurso, dados):
        erros = self.validar_campos(self.schema(recurso), dados)
        if recurso == "autorizacao":
            modo = dados.get("wan_modo")
            if modo and not dados.get("vlan"):
                erros.append("vlan: obrigatória quando há configuração de WAN")
            if modo == "pppoe" and not (
                dados.get("pppoe_usuario") and dados.get("pppoe_senha")
            ):
                erros.append("pppoe: usuário e senha são obrigatórios")
            if (
                dados.get("wifi_24_ssid") or dados.get("wifi_5_ssid")
            ) and not dados.get("wifi_senha"):
                erros.append("wifi_senha: obrigatória quando há SSID")
            if dados.get("wifi_5_ssid") and not dados.get("wifi_24_ssid"):
                erros.append("wifi_24_ssid: informe também a rede 2.4 GHz")
            if dados.get("sn"):
                try:
                    parsers.sn_str_para_hex(dados["sn"])
                except ValueError as e:
                    erros.append(f"sn: {e}")
        if recurso == "dba":
            exigidos = {
                "type1": ["fix"],
                "type2": ["assure"],
                "type3": ["assure", "max"],
                "type4": ["max"],
                "type5": ["fix", "assure", "max"],
            }
            for nome in exigidos.get(dados.get("tipo"), []):
                if not dados.get(nome):
                    erros.append(f"{nome}: obrigatório para {dados.get('tipo')}")
        if recurso == "line":
            tconts = {
                int(t["tcont"])
                for t in dados.get("tconts") or []
                if str(t.get("tcont", "")).isdigit()
            }
            gems = {
                int(g["gem"])
                for g in dados.get("gems") or []
                if str(g.get("gem", "")).isdigit()
            }
            for g in dados.get("gems") or []:
                if str(g.get("tcont", "")).isdigit() and int(g["tcont"]) not in tconts:
                    erros.append(f"gems: o T-CONT {g['tcont']} não foi declarado")
            for m in dados.get("mapeamentos") or []:
                if str(m.get("gem", "")).isdigit() and int(m["gem"]) not in gems:
                    erros.append(f"mapeamentos: a GEM {m['gem']} não foi declarada")
        if erros:
            raise ErroValidacao("; ".join(erros))

    def _renderizar(self, template, dados):
        texto = self._env.get_template(template).render(**dados)
        return [l.rstrip() for l in texto.split("\n") if l.strip()]

    def gerar_autorizacao(self, dados, consultar_id_livre=True):
        dados = {campo.nome: None for campo in SCHEMA_AUTORIZACAO} | dict(dados)
        self.validar("autorizacao", dados)
        if dados.get("onu_id") in (None, ""):
            if not consultar_id_livre:
                raise ErroValidacao("onu_id: informe o ID ou permita consultar a OLT")
            dados["onu_id"] = self.proximo_id_livre(int(dados["pon"]))
        dados["sn_hex"] = parsers.sn_str_para_hex(dados["sn"])
        return self._renderizar("autorizar.j2", dados)

    def gerar_desautorizacao(self, pon, onu_id):
        return self._renderizar("desautorizar.j2", {"pon": pon, "onu_id": onu_id})

    def gerar_reinicio(self, pon, onu_id):
        return self._renderizar("reiniciar.j2", {"pon": pon, "onu_id": onu_id})

    # Perfis e demais recursos

    def recursos(self):
        return RECURSOS

    def listar_perfis(self):
        if self._cache_perfis is None:
            self._cache_perfis = parsers.parse_perfis(
                self._consultar("show running-config ont-profile all")
            )
        return self._cache_perfis

    def listar(self, recurso):
        itens = [dict(i) for i in self.listar_perfis()[recurso]]
        for i in itens:
            if "parametros" in i:
                i["parametros_txt"] = " ".join(
                    f"{k} {v}" for k, v in i["parametros"].items()
                )
            if "linhas" in i:
                i["linhas_txt"] = "; ".join(i["linhas"])
            if recurso == "line":
                i["tconts_txt"] = _resumo(i["tconts"], "{tcont}→DBA {dba_profile_id}")
                i["gems_txt"] = _resumo(i["gems"], "{gem}→T-CONT {tcont}")
                i["mapeamentos_txt"] = _resumo(
                    i["mapeamentos"], "GEM {gem}/{indice}: {regra}"
                )
        return sorted(itens, key=lambda i: i["id"])

    def gerar_criacao(self, recurso, dados):
        if ("criar", recurso) not in TEMPLATES:
            raise ErroValidacao(f"Criação de {recurso} não suportada neste modelo")
        dados = {campo.nome: campo.padrao for campo in RECURSOS[recurso].campos} | {
            k: v for k, v in dict(dados).items() if v not in (None, "")
        }
        self.validar(recurso, dados)
        return self._renderizar(TEMPLATES[("criar", recurso)], dados)

    def gerar_remocao(self, recurso, item_id):
        if ("remover", recurso) not in TEMPLATES:
            raise ErroValidacao(f"Remoção de {recurso} não suportada neste modelo")
        return self._renderizar(TEMPLATES[("remover", recurso)], {"id": int(item_id)})

    def gerar_personalizado(self, texto_template, dados):
        texto = self._env.from_string(texto_template).render(**dados)
        return [l.rstrip() for l in texto.split("\n") if l.strip()]

    def executar(self, comandos, simular=False, salvar=False):
        comandos = list(comandos) + (["save"] if salvar else [])
        mascarados = [parsers.mascarar_senhas(c) for c in comandos]
        if simular:
            return ResultadoExecucao(mascarados, [], True, simulado=True)
        sessao = self._sessao_aberta()
        saidas = []
        for comando in comandos:
            try:
                saidas.append(sessao.enviar(comando))
            except ErroOLT as e:
                sessao.enviar("end", validar=False)
                sessao.enviar("configure", validar=False)
                return ResultadoExecucao(
                    mascarados, saidas, False, erro=parsers.mascarar_senhas(str(e))
                )
        self._cache_perfis = None
        return ResultadoExecucao(mascarados, saidas, True)


def _normalizar_pendente(registro):
    """A tabela do autofind varia de firmware para firmware; garante as chaves pon e sn quando dá para deduzir."""
    item = dict(registro)
    for chave, valor in registro.items():
        if "pon" not in item and re.fullmatch(r"\d+/\d+", valor or ""):
            item["pon"] = int(valor.split("/")[0])
        elif "pon" not in item and chave.startswith("pon") and str(valor).isdigit():
            item["pon"] = int(valor)
        if "sn" not in item and ("serial" in chave or chave.endswith("sn")) and valor:
            item["sn"] = valor
    return item
