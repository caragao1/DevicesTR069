import re
import select
import socket
import time

from olt_manager.texto import limpar

_PROMPT = r"^[\w.\-]+(?:\([\w\-]+\))?[>#]\s*$"
PROMPT = re.compile(_PROMPT, re.M)
PAGINACAO = re.compile(r"-+\s*more\s*-+|press any key", re.I)
PEDE_USUARIO = re.compile(r"(user\s*name|login|user)\s*:\s*$", re.I)
PEDE_SENHA = re.compile(r"password\s*:\s*$", re.I)
FALHA_LOGIN = re.compile(
    r"(login|authentication)\s+(failed|incorrect)|bad password|access denied", re.I
)

PROTOCOLOS = ("ssh", "telnet")
PORTA_PADRAO = {"ssh": 22, "telnet": 23}


class ErroOLT(Exception):
    pass


class SessaoCLI:
    """Sessão interativa com a CLI da OLT; as subclasses só implementam o transporte."""

    def __init__(self, host, porta, usuario, senha, timeout=15, padroes_erro=()):
        self.host = host
        self.porta = porta
        self.usuario = usuario
        self.senha = senha
        self.timeout = timeout
        self.padroes_erro = [re.compile(p, re.I) for p in padroes_erro]
        self.ultima_saida_bruta = ""  # para diagnóstico: o que a OLT mandou por último, sem limpeza

    def conectar(self):
        raise NotImplementedError

    def fechar(self):
        raise NotImplementedError

    def ativa(self):
        return True

    def descartar_pendente(self):
        """Joga fora o que a OLT mandou sem ser pedido (avisos, timeouts) antes de reutilizar a sessão."""
        while self._receber():
            pass

    def _receber(self):
        raise NotImplementedError

    def _transmitir(self, texto):
        raise NotImplementedError

    def __enter__(self):
        return self.conectar()

    def __exit__(self, *_):
        self.fechar()

    def _ler_ate(self, padrao, timeout=None):
        buffer = ""
        limite = time.monotonic() + (timeout or self.timeout)
        while time.monotonic() < limite:
            pedaco = self._receber()
            if not pedaco:
                time.sleep(0.05)
                continue
            buffer += pedaco
            self.ultima_saida_bruta = buffer
            limpo = limpar(buffer)
            ultima = limpo.rstrip("\n").split("\n")[-1] if limpo.strip() else ""
            if PAGINACAO.search(ultima):
                self._transmitir(" ")
                continue
            if padrao.search(ultima + "\n"):
                return limpo
        raise ErroOLT(
            f"Tempo esgotado esperando resposta da OLT. Última saída: {limpar(buffer)[-300:]}"
        )

    def _ler_ate_prompt(self):
        return self._ler_ate(PROMPT)

    def enviar(self, comando, validar=True):
        self._transmitir(comando + "\n")
        saida = self._ler_ate_prompt()
        linhas = saida.split("\n")
        if linhas and comando.strip() and comando.strip().split()[0] in linhas[0]:
            linhas = linhas[1:]
        if linhas and PROMPT.search(linhas[-1] + "\n"):
            linhas = linhas[:-1]
        resultado = "\n".join(linhas).strip("\n")
        if validar:
            for padrao in self.padroes_erro:
                if padrao.search(resultado):
                    raise ErroOLT(
                        f"A OLT recusou o comando '{comando}': {resultado.strip()}"
                    )
        return resultado


class SessaoSSH(SessaoCLI):
    _cliente = None
    _canal = None

    def conectar(self):
        import paramiko

        cliente = paramiko.SSHClient()
        cliente.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            cliente.connect(
                self.host,
                port=self.porta,
                username=self.usuario,
                password=self.senha,
                timeout=self.timeout,
                look_for_keys=False,
                allow_agent=False,
            )
        except (paramiko.SSHException, OSError) as e:
            raise ErroOLT(
                f"Falha ao conectar via SSH em {self.host}:{self.porta}: {e}"
            ) from e
        self._cliente = cliente
        self._canal = cliente.invoke_shell(width=250, height=1000)
        self._ler_ate_prompt()
        return self

    def fechar(self):
        if self._cliente:
            self._cliente.close()
        self._cliente = self._canal = None

    def ativa(self):
        transporte = self._cliente.get_transport() if self._cliente else None
        return bool(transporte and transporte.is_active() and self._canal and not self._canal.closed)

    def _receber(self):
        if self._canal.recv_ready():
            return self._canal.recv(65535).decode("utf-8", errors="replace")
        return ""

    def _transmitir(self, texto):
        self._canal.send(texto)


IAC, DONT, DO, WONT, WILL, SB, SE = 255, 254, 253, 252, 251, 250, 240
ECHO, SGA = 1, 3


class SessaoTelnet(SessaoCLI):
    """Cliente Telnet mínimo (telnetlib saiu do Python 3.13): recusa todas as opções exceto ECHO e SGA do servidor."""

    _sock = None

    def conectar(self):
        try:
            self._sock = socket.create_connection(
                (self.host, self.porta), timeout=self.timeout
            )
        except OSError as e:
            raise ErroOLT(
                f"Falha ao conectar via Telnet em {self.host}:{self.porta}: {e}"
            ) from e
        self._sock.setblocking(False)
        self._pendente = b""
        tela = self._ler_ate(
            re.compile(
                f"{PEDE_USUARIO.pattern}|{PEDE_SENHA.pattern}|{_PROMPT}", re.I | re.M
            )
        )
        ultima = tela.rstrip("\n").split("\n")[-1]
        if PEDE_USUARIO.search(ultima):
            self._transmitir(self.usuario + "\n")
            self._ler_ate(PEDE_SENHA)
            ultima = "password:"
        if PEDE_SENHA.search(ultima):
            self._transmitir(self.senha + "\n")
            tela = self._ler_ate(
                re.compile(
                    f"{_PROMPT}|{PEDE_USUARIO.pattern}|{FALHA_LOGIN.pattern}",
                    re.I | re.M,
                )
            )
            if not PROMPT.search(tela.rstrip("\n").split("\n")[-1] + "\n"):
                self.fechar()
                raise ErroOLT("A OLT recusou usuário ou senha (Telnet)")
        return self

    def fechar(self):
        if self._sock:
            self._sock.close()
        self._sock = None

    def ativa(self):
        if self._sock is None:
            return False
        prontos, _, _ = select.select([self._sock], [], [], 0)
        if not prontos:
            return True
        try:
            return self._sock.recv(1, socket.MSG_PEEK) != b""
        except BlockingIOError:
            return True
        except OSError:
            return False

    def _transmitir(self, texto):
        dados = (
            texto.replace("\n", "\r\n")
            .encode("utf-8")
            .replace(bytes([IAC]), bytes([IAC, IAC]))
        )
        self._sock.setblocking(True)
        try:
            self._sock.sendall(dados)
        finally:
            self._sock.setblocking(False)

    def _receber(self):
        prontos, _, _ = select.select([self._sock], [], [], 0)
        if not prontos:
            return ""
        try:
            bruto = self._sock.recv(65535)
        except BlockingIOError:
            return ""
        if not bruto:
            raise ErroOLT("A OLT encerrou a conexão Telnet")
        return self._negociar(self._pendente + bruto).decode("utf-8", errors="replace")

    def _negociar(self, dados):
        texto, respostas, i = bytearray(), bytearray(), 0
        self._pendente = b""
        while i < len(dados):
            b = dados[i]
            if b != IAC:
                texto.append(b)
                i += 1
                continue
            if i + 1 >= len(dados):
                self._pendente = dados[i:]
                break
            cmd = dados[i + 1]
            if cmd == IAC:
                texto.append(IAC)
                i += 2
            elif cmd in (DO, DONT, WILL, WONT):
                if i + 2 >= len(dados):
                    self._pendente = dados[i:]
                    break
                opcao = dados[i + 2]
                if cmd == DO:
                    respostas += bytes([IAC, WONT, opcao])
                elif cmd == WILL:
                    respostas += bytes(
                        [IAC, DO if opcao in (ECHO, SGA) else DONT, opcao]
                    )
                i += 3
            elif cmd == SB:
                fim = dados.find(bytes([IAC, SE]), i)
                if fim < 0:
                    self._pendente = dados[i:]
                    break
                i = fim + 2
            else:
                i += 2
        if respostas:
            self._sock.setblocking(True)
            try:
                self._sock.sendall(bytes(respostas))
            finally:
                self._sock.setblocking(False)
        return bytes(texto)


def abrir_sessao(protocolo, host, porta, usuario, senha, timeout=15, padroes_erro=()):
    classes = {"ssh": SessaoSSH, "telnet": SessaoTelnet}
    if protocolo not in classes:
        raise ErroOLT(f"Protocolo desconhecido: {protocolo}")
    return classes[protocolo](
        host, porta, usuario, senha, timeout, padroes_erro
    ).conectar()
