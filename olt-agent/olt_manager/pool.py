"""Reaproveita a sessão com cada OLT entre requisições: o login SSH/Telnet custa segundos, um comando não."""

import threading
import time
from contextlib import contextmanager

from olt_manager.drivers import DRIVERS
from olt_manager.drivers.base import ErroValidacao

OCIOSA_MAX = 120  # segundos sem uso antes de fechar a sessão

_trava = threading.Lock()
_sessoes = {}  # assinatura da conexão -> {"trava", "driver", "uso"}


def _fechar(driver):
    try:
        driver.fechar()
    except Exception:  # a sessão já pode estar morta; fechar não deve gerar outro erro
        pass


def _fechar_ociosas():
    agora = time.monotonic()
    for entrada in _sessoes.values():
        if entrada["driver"] and agora - entrada["uso"] > OCIOSA_MAX and entrada["trava"].acquire(blocking=False):
            try:
                _fechar(entrada["driver"])
                entrada["driver"] = None
            finally:
                entrada["trava"].release()


@contextmanager
def conexao(driver, host, porta, usuario, senha, protocolo="ssh", timeout=15):
    """Driver pronto para uso. Uma requisição por vez por OLT, para os comandos não se misturarem na mesma sessão."""
    if driver not in DRIVERS:
        raise ErroValidacao(f"driver: '{driver}' não existe; use {', '.join(DRIVERS)}")
    assinatura = (driver, host, int(porta), protocolo, usuario, senha)
    with _trava:
        _fechar_ociosas()
        entrada = _sessoes.setdefault(assinatura, {"trava": threading.Lock(), "driver": None, "uso": 0})
    with entrada["trava"]:
        atual = entrada["driver"]
        if atual is not None and not atual.conectado():
            _fechar(atual)
            atual = None
        if atual is None:
            atual = DRIVERS[driver](host=host, porta=int(porta), usuario=usuario, senha=senha, timeout=timeout, protocolo=protocolo)
        else:
            atual.preparar_reuso()
        entrada["driver"] = atual
        try:
            yield atual
        except ErroValidacao:
            raise
        except BaseException:
            _fechar(atual)
            entrada["driver"] = None
            raise
        finally:
            entrada["uso"] = time.monotonic()


def fechar_todas():
    with _trava:
        for entrada in _sessoes.values():
            if entrada["driver"]:
                _fechar(entrada["driver"])
                entrada["driver"] = None
