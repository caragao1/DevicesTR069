"""Textos explicativos exibidos na interface. Valem para qualquer fabricante GPON."""

CURTO = {
    "line": "Estrutura lógica da ONU na PON: T-CONTs, GEM ports e mapeamento de VLAN",
    "srv": "Portas da ONU (Ethernet, telefone) e como cada uma trata VLAN",
    "tr069": "Servidor ACS que vai gerenciar a ONU remotamente",
    "dba_tipo": "type1 fixo · type2 garantido · type3 garantido+máximo · type4 só máximo (internet residencial) · type5 todos",
}

LONGO = {
    "dba": (
        "O DBA (Dynamic Bandwidth Allocation) define quanto de banda de UPLOAD a OLT entrega para cada T-CONT. "
        "Na GPON o download é transmitido para todos, mas o upload é dividido no tempo: a OLT decide quando cada ONU pode falar, "
        "e o DBA profile é a regra dessa divisão.\n"
        "• type1 — fixo (fix): banda sempre reservada, mesmo sem uso. Para serviços críticos (voz, TDM).\n"
        "• type2 — garantido (assure): entregue sempre que a ONU pedir.\n"
        "• type3 — garantido + máximo (assure + max): garante um mínimo e permite crescer até o máximo se houver sobra.\n"
        "• type4 — melhor esforço (max): só um teto. É o mais usado em planos residenciais.\n"
        "• type5 — combinação de fix + assure + max.\n"
        "Valores em kbps (100 Mbps = 102400 ou 100000, conforme o padrão da sua rede). Usado dentro dos line profiles."
    ),
    "line": (
        "O line profile descreve como a ONU se organiza dentro da PON. Toda ONU autorizada aponta para um.\n"
        "• T-CONT: contêiner de upload. Cada T-CONT recebe um DBA profile, que limita a banda de subida.\n"
        "• GEM port: canal lógico que carrega o tráfego entre ONU e OLT. Cada GEM pertence a um T-CONT.\n"
        "• Mapeamento: diz qual tráfego entra em cada GEM (por VLAN, por prioridade, ou 'vlan transparent' para tudo).\n"
        "Exemplo comum: 1 T-CONT com DBA de 500M, 1 GEM nesse T-CONT, mapeamento 'vlan transparent'."
    ),
    "srv": (
        "O service profile (srv profile) descreve o hardware da ONU e o tratamento das portas do lado do cliente: "
        "quantas portas Ethernet e telefônicas, e como cada porta trata VLAN (transparent repassa tudo; "
        "tag/translation marca ou troca a VLAN). Toda ONU autorizada aponta para um service profile. "
        "'adaptive' deixa a OLT descobrir sozinha quantas portas a ONU tem."
    ),
    "traffic": (
        "O traffic profile limita a velocidade de um fluxo: CIR (Committed Information Rate) é a taxa garantida "
        "e PIR (Peak Information Rate) é o máximo permitido. Usado para limitar download/upload de serviços, "
        "por exemplo, em service-ports ou portas da ONU. Valores em kbps."
    ),
    "tr069": (
        "TR-069 (CWMP) é o protocolo de gerência remota das ONUs. O perfil guarda o endereço do servidor ACS "
        "(IXC ACS, GenieACS, etc.) e as credenciais. A ONU que recebe esse perfil passa a se reportar ao ACS, "
        "que consegue trocar Wi-Fi, atualizar firmware e diagnosticar remotamente."
    ),
    "sip": (
        "O perfil SIP configura a telefonia (VoIP) das portas FXS/POTS das ONUs: servidor proxy, registrar, "
        "domínio e modo de fax. Só é usado em ONUs com porta telefônica."
    ),
    "service_port": (
        "A service-port liga o tráfego de uma ONU (porta PON / ID / GEM) a uma VLAN da OLT, encaminhando para o uplink. "
        "Em modelos como Huawei e ZTE é obrigatória para a ONU navegar."
    ),
    "vlan": "VLANs criadas na OLT e em quais portas de uplink elas trafegam.",
}

ONU = {
    "autorizadas": (
        "ONUs já provisionadas na OLT. 'Run State' Online indica que a ONU está ativa na PON agora; "
        "'Última queda' mostra o motivo informado pela OLT: perda de sinal óptico (LOS) aponta fibra ou conector; "
        "falta de energia (Power down / dying-gasp) indica a ONU desligada ou sem fonte. "
        "Uma ONU offline não afeta o estado da OLT, que continua respondendo normalmente."
    ),
    "pendentes": (
        "ONUs que estão ligadas na fibra mas ainda não foram autorizadas (autofind). "
        "Clique em Autorizar para escolher perfis, VLAN e WAN e gerar os comandos."
    ),
    "sinal": (
        "Potência óptica. Rx ONU é o sinal que a ONU recebe da OLT; Rx OLT é o que a OLT recebe da ONU. "
        "Faixa típica GPON (classe B+): entre -8 e -27 dBm. Abaixo de -27 dBm o cliente tende a ter quedas; "
        "acima de -8 dBm o sinal está forte demais e pode saturar o receptor."
    ),
}

LIMITE_SINAL_CRITICO = -27.0
LIMITE_SINAL_ALERTA = -25.0
LIMITE_SINAL_FORTE = -8.0

# Tradução do "Last Link down reason" das ONUs. A chave é procurada no texto da OLT, sem diferenciar maiúsculas.
MOTIVOS_QUEDA = [
    ("power down", "Falta de energia na ONU"),
    ("dying", "Falta de energia na ONU"),
    ("lofi", "Perda de quadros (sinal ruim)"),
    ("lof", "Perda de quadros (sinal ruim)"),
    ("los", "Perda de sinal óptico (fibra/conector)"),
    ("deactiv", "Desativada pela OLT"),
    ("reboot", "Reiniciada"),
]
