import re

from olt_manager.texto import limpar  # noqa: F401 (reexportado)

SEP = re.compile(r"^-{10,}\s*$")
NO_AUTOFIND = "do not exist"


def sn_hex_para_str(sn_hex):
    sn_hex = sn_hex.strip().lower()
    if len(sn_hex) != 16:
        return sn_hex
    try:
        fabricante = bytes.fromhex(sn_hex[:8]).decode("ascii")
    except (ValueError, UnicodeDecodeError):
        return sn_hex
    return fabricante + sn_hex[8:]


def sn_str_para_hex(sn):
    sn = sn.strip()
    if len(sn) == 16 and re.fullmatch(r"[0-9a-fA-F]{16}", sn):
        return sn.lower()
    if len(sn) == 12:
        return sn[:4].encode("ascii").hex() + sn[4:].lower()
    raise ValueError(f"Serial em formato desconhecido: {sn}")


def _colunas_do_cabecalho(linha):
    return [(m.start(), m.group().strip()) for m in re.finditer(r"\S+(?: \S+)*", linha)]


def _tabela_largura_fixa(texto):
    linhas = [l.rstrip() for l in limpar(texto).split("\n") if l.strip()]
    seps = [i for i, l in enumerate(linhas) if SEP.match(l)]
    if len(seps) < 2:
        return []
    cab = linhas[seps[0] + 1 : seps[1]]
    if not cab:
        return []
    colunas = _colunas_do_cabecalho(cab[0])
    nomes = []
    for i, (ini, nome) in enumerate(colunas):
        fim = colunas[i + 1][0] if i + 1 < len(colunas) else None
        partes = [nome]
        for extra in cab[1:]:
            pedaco = extra[ini:fim].strip() if fim else extra[ini:].strip()
            if pedaco:
                partes.append(pedaco)
        nomes.append(" ".join(partes))
    fim_dados = seps[2] if len(seps) > 2 else len(linhas)
    registros = []
    for linha in linhas[seps[1] + 1 : fim_dados]:
        if not linha.strip():
            continue
        reg = {}
        for i, (ini, _) in enumerate(colunas):
            fim = colunas[i + 1][0] if i + 1 < len(colunas) else None
            reg[nomes[i]] = (linha[ini:fim] if fim else linha[ini:]).strip()
        registros.append(reg)
    return registros


def parse_ont_info(texto):
    onus = []
    for reg in _tabela_largura_fixa(texto):
        pon_onu = reg.get("PON/ONU", "")
        if "/" not in pon_onu:
            continue
        pon, onu = pon_onu.split("/", 1)
        onus.append(
            {
                "pon": int(pon),
                "onu_id": int(onu),
                "sn": reg.get("Serial Number", ""),
                "estado": reg.get("State", ""),
                "run_state": reg.get("Run State", ""),
                "config_state": reg.get("Config State", ""),
                "match_state": reg.get("Match State", ""),
                "ultima_queda": reg.get("Last Link down reason", ""),
                "nome": reg.get("ONT Name", ""),
                "online": reg.get("Run State", "").lower() == "online",
            }
        )
    return onus


OPTICAL = re.compile(
    r"^\s*(?P<pon>\d+)/(?P<onu>\d+)\s+(?P<sn>\S+)\s+"
    r"(?P<temp>\S+)\s*C\s+(?P<volt>\S+)\s*V\s+(?P<bias>\S+)\s*mA\s+"
    r"(?P<tx>\S+)\s*dBm\s+(?P<rx>\S+)\s*dBm\s*(?:(?P<olt_rx>-?[\d.]+|N/A|--)\s*dBm\s*)?(?P<nome>.*)$"
)


def _num(valor):
    try:
        return float(valor)
    except ValueError:
        return None


def parse_ont_optical(texto):
    resultado = []
    for linha in limpar(texto).split("\n"):
        m = OPTICAL.match(linha)
        if not m:
            continue
        resultado.append(
            {
                "pon": int(m["pon"]),
                "onu_id": int(m["onu"]),
                "sn": m["sn"],
                "temperatura_c": _num(m["temp"]),
                "tensao_v": _num(m["volt"]),
                "bias_ma": _num(m["bias"]),
                "tx_dbm": _num(m["tx"]),
                "rx_dbm": _num(m["rx"]),
                "olt_rx_dbm": _num(m["olt_rx"]) if m["olt_rx"] else None,
                "nome": m["nome"].strip(),
            }
        )
    return resultado


# Campos do autofind em blocos ("ONU SN : ...") -> chave usada pelo sistema
CAMPOS_AUTOFIND = {
    "pon id": "pon",
    "onu id": "indice",
    "onu sn": "sn",
    "loid": "loid",
    "vendor id": "fabricante",
    "ont equipmentid": "modelo",
    "ont version": "hardware",
    "ont softwareversion": "firmware",
    "ont autofind time": "detectada_em",
}
SN_COM_HEX = re.compile(r"^([0-9a-fA-F]{16})\((\S+)\)$")


def _autofind_em_blocos(texto):
    """Formato da HSGQ G02: um bloco "campo : valor" por ONU, entre linhas de traços."""
    pendentes, atual = [], {}
    for linha in limpar(texto).split("\n"):
        if SEP.match(linha.strip()):
            if atual:
                pendentes.append(atual)
            atual = {}
            continue
        if ":" not in linha:
            continue
        chave, valor = (p.strip() for p in linha.split(":", 1))
        nome = CAMPOS_AUTOFIND.get(chave.lower())
        if not nome:
            continue  # senhas (ONU/LOID password) e campos técnicos ficam de fora
        if nome == "sn":
            m = SN_COM_HEX.match(valor)
            if m:
                atual["sn_hex"], valor = m.group(1).lower(), m.group(2)
        if nome in ("pon", "indice") and valor.isdigit():
            valor = int(valor)
        if valor != "":
            atual[nome] = valor
    if atual:
        pendentes.append(atual)
    return [p for p in pendentes if "sn" in p]


def parse_ont_autofind(texto):
    if NO_AUTOFIND in texto:
        return []
    if re.search(r"(?im)^\s*ONU SN\s*:", limpar(texto)):
        return _autofind_em_blocos(texto)
    # firmwares que listam em tabela de colunas
    pendentes = []
    for reg in _tabela_largura_fixa(texto):
        pendentes.append(
            {
                chave.lower().replace(" ", "_").replace("/", "_"): valor
                for chave, valor in reg.items()
            }
        )
    return pendentes


def _kv(tokens):
    dados = {}
    i = 0
    while i < len(tokens) - 1:
        dados[tokens[i]] = tokens[i + 1]
        i += 2
    return dados


DBA_TIPO = re.compile(r"(type\d)\s+(.*)$")


def parse_perfis(texto):
    perfis = {"dba": [], "line": [], "srv": [], "sip": [], "tr069": [], "traffic": []}
    bloco = None
    for linha in limpar(texto).split("\n"):
        bruta = linha.rstrip()
        if not bruta or bruta.startswith("!"):
            continue
        if bloco is not None:
            interna = bruta.strip()
            if interna == "exit":
                perfis[bloco["_tipo"]].append(
                    {k: v for k, v in bloco.items() if k != "_tipo"}
                )
                bloco = None
            elif interna != "commit":
                bloco["linhas"].append(interna)
                if bloco["_tipo"] == "line":
                    _detalhar_line(bloco, interna)
            continue
        tokens = bruta.split()
        if tokens[:2] == ["dba-profile", "add"]:
            m = DBA_TIPO.search(bruta)
            dados = _kv(tokens[2 : tokens.index(m.group(1))] if m else tokens[2:])
            parametros = _kv(m.group(2).split()) if m else {}
            perfis["dba"].append(
                {
                    "id": int(dados.get("profile-id", -1)),
                    "nome": dados.get("profile-name", ""),
                    "tipo": m.group(1) if m else "",
                    "parametros": {k: int(v) for k, v in parametros.items()},
                }
            )
        elif tokens[:2] == ["ont-tr069-profile", "add"]:
            dados = _kv(tokens[2:])
            perfis["tr069"].append(
                {
                    "id": int(dados.get("profile-id", -1)),
                    "nome": dados.get("profile-name", ""),
                    "url": dados.get("url", ""),
                    "usuario": dados.get("user", ""),
                }
            )
        elif tokens[:2] == ["ont-traffic-profile", "add"]:
            dados = _kv(tokens[2:])
            perfis["traffic"].append(
                {
                    "id": int(dados.get("profile-id", -1)),
                    "nome": dados.get("profile-name", ""),
                    "parametros": {
                        k: v
                        for k, v in dados.items()
                        if k not in ("profile-id", "profile-name")
                    },
                }
            )
        elif (
            tokens[0] in ("ont-lineprofile", "ont-srvprofile", "ont-sipprofile")
            and len(tokens) > 1
            and tokens[1] == "gpon"
        ):
            dados = _kv(tokens[2:])
            tipo = {
                "ont-lineprofile": "line",
                "ont-srvprofile": "srv",
                "ont-sipprofile": "sip",
            }[tokens[0]]
            bloco = {
                "_tipo": tipo,
                "id": int(dados.get("profile-id", -1)),
                "nome": dados.get("profile-name", ""),
                "linhas": [],
            }
            if tipo == "line":
                bloco.update({"tconts": [], "gems": [], "mapeamentos": []})
    return perfis


def _detalhar_line(bloco, linha):
    t = linha.split()
    if t[0] == "tcont" and len(t) >= 4:
        bloco["tconts"].append({"tcont": int(t[1]), "dba_profile_id": int(t[3])})
    elif t[:2] == ["gem", "add"] and len(t) >= 5:
        bloco["gems"].append({"gem": int(t[2]), "tcont": int(t[4])})
    elif t[:2] == ["gem", "mapping"] and len(t) >= 4:
        bloco["mapeamentos"].append(
            {"gem": int(t[2]), "indice": int(t[3]), "regra": " ".join(t[4:])}
        )


def mascarar_senhas(texto):
    texto = re.sub(r"(ipmode pppoe \S+ )\S+", r"\1******", texto)
    texto = re.sub(r"(password )\S+", r"\1******", texto)
    texto = re.sub(r"(wpa2(?:mixed)? |wep |sharekey )\S+", r"\1******", texto)
    return texto


def _primeiro_numero(tokens):
    for token in tokens[1:4]:
        if token.isdigit():
            return int(token)
    return None


def parse_config_gpon(texto):
    pons = {}
    atual = None
    for linha in limpar(texto).split("\n"):
        l = linha.strip()
        if not l or l.startswith("!"):
            continue
        m = re.match(r"^interface gpon (\d+)$", l)
        if m:
            atual = {
                "pon": int(m.group(1)),
                "autorizacao_auto": None,
                "autofind": None,
                "onus": {},
                "outros": [],
            }
            pons[atual["pon"]] = atual
            continue
        if atual is None:
            continue
        if l == "exit":
            atual = None
            continue
        t = l.split()
        if t[:2] == ["ont", "add"] and "sn-auth" in t:
            onu_id = int(t[2])
            sn_hex = t[t.index("sn-auth") + 1]
            dados = _kv(t[t.index("omci") + 1 :]) if "omci" in t else {}
            atual["onus"][onu_id] = {
                "onu_id": onu_id,
                "sn_hex": sn_hex,
                "sn": sn_hex_para_str(sn_hex),
                "line_profile_id": (
                    int(dados["ont-lineprofile-id"])
                    if "ont-lineprofile-id" in dados
                    else None
                ),
                "srv_profile_id": (
                    int(dados["ont-srvprofile-id"])
                    if "ont-srvprofile-id" in dados
                    else None
                ),
                "comandos": [l],
            }
        elif t[0] == "ont" and _primeiro_numero(t) in atual["onus"]:
            atual["onus"][_primeiro_numero(t)]["comandos"].append(mascarar_senhas(l))
        elif t[:2] == ["ont", "authorize"]:
            atual["autorizacao_auto"] = l
        elif t[:2] == ["port", "ont-autofind"]:
            atual["autofind"] = t[2] == "enable"
        else:
            atual["outros"].append(l)
    return pons
