from pathlib import Path

from olt_manager.drivers.hsgq.driver import DriverHSGQ

SAIDAS = Path(__file__).parent / "saidas"

RESPOSTAS = {
    "show ont-info": "ont_info.txt",
    "show ont-autofind": "ont_autofind.txt",
    "show ont-optical": "ont_optical.txt",
    "show running-config ont-profile": "perfis.txt",
    "show running-config gpon": "config_gpon.txt",
}


class SessaoDemo:
    """Responde com saídas gravadas de uma HSGQ real; comandos de escrita são aceitos e descartados."""

    def enviar(self, comando, validar=True):
        for prefixo, arquivo in RESPOSTAS.items():
            if comando.startswith(prefixo):
                return (SAIDAS / arquivo).read_text(encoding="utf-8")
        return ""

    def fechar(self):
        pass

    def ativa(self):
        return True

    def descartar_pendente(self):
        pass


class DriverDemo(DriverHSGQ):
    fabricante = "Demonstração"
    modelos = ["HSGQ simulada (sem equipamento)"]

    def _sessao_aberta(self):
        if self._sessao is None:
            self._sessao = SessaoDemo()
        return self._sessao

    def sinal(self, pon=None, incluir_olt_rx=True):
        return super().sinal(pon, incluir_olt_rx=False)
