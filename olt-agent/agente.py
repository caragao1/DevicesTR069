"""Agente HTTP que executa as operações nas OLTs para a aba OLT do DevicesTR069.

Roda dentro da rede das OLTs. Não guarda nada: cada requisição traz os dados
de conexão da OLT (o cadastro e o histórico ficam no banco do DevicesTR069).

    OLT_AGENT_TOKEN=<segredo> python agente.py            # escuta em 127.0.0.1:8770
    OLT_AGENT_HOST=0.0.0.0 OLT_AGENT_PORT=8770 ...        # para aceitar de outra máquina

Toda requisição precisa do cabeçalho  Authorization: Bearer <OLT_AGENT_TOKEN>.
"""

import dataclasses
import hmac
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from olt_manager.conexao import ErroOLT
from olt_manager.drivers import DRIVERS, textos
from olt_manager.drivers.base import ErroValidacao
from olt_manager.monitoramento import juntar_onus_e_sinal, traduzir_queda
from olt_manager.pool import conexao

VERSAO = "1.0"
TAMANHO_MAXIMO = 1_000_000
TIMEOUT_OLT = int(os.environ.get("OLT_TIMEOUT", "15"))
ACOES = {"autorizar", "desautorizar", "reiniciar", "criar", "remover", "script"}
ROTAS_OLT = {"/testar", "/onus", "/onu", "/pendentes", "/recursos/listar", "/opcoes", "/comandos", "/executar", "/coletar"}

log = logging.getLogger("olt-agent")


class ErroRequisicao(Exception):
    def __init__(self, status, corpo):
        super().__init__(corpo)
        self.status = status
        self.corpo = corpo


def _serializar(objeto):
    dados = dataclasses.asdict(objeto)
    for chave, valor in dados.items():
        if isinstance(valor, set):
            dados[chave] = sorted(valor)
    return dados


def descrever_drivers():
    drivers = []
    for chave, classe in DRIVERS.items():
        instancia = classe("", 0, "", "")
        drivers.append({
            "chave": chave,
            "fabricante": classe.fabricante,
            "modelos": classe.modelos,
            "acoes_nao_homologadas": sorted(classe.acoes_nao_homologadas),
            "schema_autorizacao": [_serializar(c) for c in instancia.schema_autorizacao()],
            "recursos": [_serializar(r) for r in instancia.recursos().values()],
        })
    return {
        "versao": VERSAO,
        "drivers": drivers,
        "textos": {
            "onu": textos.ONU,
            "glossario": textos.LONGO,
            "limites": {
                "critico": textos.LIMITE_SINAL_CRITICO,
                "alerta": textos.LIMITE_SINAL_ALERTA,
                "forte": textos.LIMITE_SINAL_FORTE,
            },
        },
    }


def _abrir(corpo):
    olt = corpo.get("olt")
    if not isinstance(olt, dict):
        raise ErroRequisicao(400, {"erro": "Informe 'olt' com driver, host, porta, protocolo, usuario e senha."})
    faltando = [c for c in ("driver", "host", "porta", "usuario", "senha") if olt.get(c) in (None, "")]
    if faltando:
        raise ErroRequisicao(400, {"erro": f"Faltam dados da OLT: {', '.join(faltando)}"})
    return conexao(
        olt["driver"], olt["host"], olt["porta"], olt["usuario"], olt["senha"],
        protocolo=olt.get("protocolo", "ssh"), timeout=TIMEOUT_OLT,
    )


def _inteiro(valor, nome):
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise ErroValidacao(f"{nome}: deve ser número")


def _recurso(driver, chave, permissao):
    recurso = driver.recursos().get(chave)
    if recurso is None:
        raise ErroValidacao(f"recurso: '{chave}' não existe neste modelo")
    if permissao and not getattr(recurso, permissao):
        raise ErroValidacao(f"recurso: este modelo não permite essa operação em {recurso.titulo}")
    return recurso


def gerar_comandos(driver, operacao, para_executar=False):
    """Devolve (comandos, operação com valores resolvidos, aviso de não homologado)."""
    acao = operacao.get("acao")
    if acao not in ACOES:
        raise ErroValidacao(f"acao: use {', '.join(sorted(ACOES))}")
    operacao = dict(operacao)
    if acao == "autorizar":
        dados = dict(operacao.get("dados") or {})
        if dados.get("onu_id") in (None, ""):
            if para_executar:
                raise ErroValidacao("onu_id: gere a prévia antes de executar")
            if str(dados.get("pon", "")).isdigit():
                dados["onu_id"] = str(driver.proximo_id_livre(int(dados["pon"])))
        operacao["dados"] = dados
        return driver.gerar_autorizacao(dados, consultar_id_livre=False), operacao, False
    if acao in ("desautorizar", "reiniciar"):
        pon, onu_id = _inteiro(operacao.get("pon"), "pon"), _inteiro(operacao.get("onu_id"), "onu_id")
        gerar = driver.gerar_desautorizacao if acao == "desautorizar" else driver.gerar_reinicio
        return gerar(pon, onu_id), operacao, acao in driver.acoes_nao_homologadas
    if acao == "criar":
        recurso = _recurso(driver, operacao.get("recurso"), "pode_criar")
        return driver.gerar_criacao(recurso.chave, operacao.get("dados") or {}), operacao, "criar" in recurso.nao_homologado
    if acao == "remover":
        recurso = _recurso(driver, operacao.get("recurso"), "pode_remover")
        item_id = _inteiro(operacao.get("item_id"), "item_id")
        return driver.gerar_remocao(recurso.chave, item_id), operacao, "remover" in recurso.nao_homologado
    comandos = [str(c).rstrip() for c in operacao.get("comandos") or [] if str(c).strip()]
    if not comandos:
        raise ErroValidacao("comandos: digite ao menos um comando")
    return comandos, operacao, True


def _onus(driver, pon=None, olt_rx=False):
    onus = juntar_onus_e_sinal(driver.listar_autorizadas(pon), driver.sinal(pon, incluir_olt_rx=olt_rx))
    for onu in onus:
        onu["queda_traduzida"] = traduzir_queda(onu.get("ultima_queda"))
    return onus


def tratar(caminho, corpo):
    if caminho == "/saude":
        return {"ok": True, "versao": VERSAO}
    if caminho == "/drivers":
        return descrever_drivers()
    if caminho not in ROTAS_OLT:
        raise ErroRequisicao(404, {"erro": f"Rota desconhecida: {caminho}"})
    with _abrir(corpo) as driver:
        if caminho == "/testar":
            return driver.testar_conexao()
        if caminho == "/onus":
            pon = corpo.get("pon")
            return {"onus": _onus(driver, _inteiro(pon, "pon") if pon not in (None, "") else None, bool(corpo.get("olt_rx")))}
        if caminho == "/onu":
            pon, onu_id = _inteiro(corpo.get("pon"), "pon"), _inteiro(corpo.get("onu_id"), "onu_id")
            atual = [o for o in _onus(driver, pon) if o["pon"] == pon and o["onu_id"] == onu_id]
            detalhes = driver.detalhes_onu(pon, onu_id)
            return {"atual": atual[0] if atual else None, "detalhes": detalhes or None}
        if caminho == "/pendentes":
            return {"pendentes": driver.listar_pendentes()}
        if caminho == "/recursos/listar":
            recurso = _recurso(driver, corpo.get("recurso"), None)
            return {"itens": driver.listar(recurso.chave)}
        if caminho == "/opcoes":
            opcoes = {}
            for origem in corpo.get("origens") or []:
                try:
                    opcoes[origem] = [[str(i["id"]), f'{i["id"]} — {i.get("nome", "")}'] for i in driver.listar(origem)]
                except (KeyError, NotImplementedError):
                    opcoes[origem] = []
            return {"opcoes": opcoes}
        if caminho == "/comandos":
            comandos, operacao, aviso = gerar_comandos(driver, corpo.get("operacao") or {})
            previa = driver.executar(comandos, simular=True, salvar=bool(corpo.get("salvar")))
            return {"comandos": previa.comandos, "operacao": operacao, "nao_homologado": aviso}
        if caminho == "/executar":
            comandos, _, _ = gerar_comandos(driver, corpo.get("operacao") or {}, para_executar=True)
            resultado = driver.executar(comandos, salvar=bool(corpo.get("salvar")))
            return dataclasses.asdict(resultado)
        if caminho == "/coletar":
            return {"onus": _onus(driver, olt_rx=True), "pendentes": len(driver.listar_pendentes())}


class Manipulador(BaseHTTPRequestHandler):
    server_version = f"olt-agent/{VERSAO}"

    def _responder(self, status, corpo):
        dados = json.dumps(corpo, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def _autorizado(self):
        token = self.server.token
        recebido = self.headers.get("Authorization", "")
        return hmac.compare_digest(recebido.encode(), f"Bearer {token}".encode())

    def _processar(self, corpo):
        if not self._autorizado():
            return self._responder(401, {"erro": "Token do agente inválido"})
        try:
            self._responder(200, tratar(self.path.split("?")[0], corpo))
        except ErroRequisicao as e:
            self._responder(e.status, e.corpo)
        except ErroValidacao as e:
            self._responder(422, {"erro": "Dados inválidos", "erros": str(e).split("; ")})
        except (ErroOLT, OSError) as e:
            self._responder(502, {"erro": str(e)})
        except Exception:  # nunca derrubar o agente nem vazar detalhes internos
            log.exception("Erro inesperado em %s", self.path)
            self._responder(500, {"erro": "Erro interno do agente; veja o log do agente."})

    def do_GET(self):
        self._processar({})

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho > TAMANHO_MAXIMO:
            return self._responder(413, {"erro": "Requisição grande demais"})
        try:
            corpo = json.loads(self.rfile.read(tamanho) or b"{}")
        except json.JSONDecodeError:
            return self._responder(400, {"erro": "JSON inválido"})
        if not isinstance(corpo, dict):
            return self._responder(400, {"erro": "O corpo deve ser um objeto JSON"})
        self._processar(corpo)

    def log_message(self, formato, *args):  # só caminho e status; nada do corpo (senhas)
        log.info("%s %s", self.address_string(), formato % args)


def criar_servidor(host, porta, token):
    servidor = ThreadingHTTPServer((host, porta), Manipulador)
    servidor.daemon_threads = True
    servidor.token = token
    return servidor


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token = os.environ.get("OLT_AGENT_TOKEN", "")
    if len(token) < 16:
        sys.exit("Defina OLT_AGENT_TOKEN com pelo menos 16 caracteres (ex.: openssl rand -hex 32).")
    host = os.environ.get("OLT_AGENT_HOST", "127.0.0.1")
    porta = int(os.environ.get("OLT_AGENT_PORT", "8770"))
    servidor = criar_servidor(host, porta, token)
    log.info("Agente de OLTs escutando em http://%s:%s (drivers: %s)", host, porta, ", ".join(DRIVERS))
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()
