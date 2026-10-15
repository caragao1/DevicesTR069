import socket
import threading
import unittest

from olt_manager.conexao import DO, ECHO, IAC, WILL, WONT, ErroOLT, abrir_sessao


class ServidorTelnetFalso(threading.Thread):
    """Simula a CLI de uma OLT via Telnet: negocia opções, pede login e responde comandos."""

    def __init__(self, senha_correta="certa"):
        super().__init__(daemon=True)
        self.sock = socket.socket()
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(1)
        self.porta = self.sock.getsockname()[1]
        self.senha_correta = senha_correta
        self.recebido = b""

    def _linha(self, conn):
        dados = b""
        while not dados.endswith(b"\r\n"):
            pedaco = conn.recv(1)
            if not pedaco:
                return None
            dados += pedaco
            self.recebido += pedaco
        return dados.strip().decode()

    def run(self):
        conn, _ = self.sock.accept()
        conn.sendall(bytes([IAC, WILL, ECHO, IAC, DO, 24]) + b"\r\nUsername: ")
        self.negociacao = b""
        while len(self.negociacao) < 6:
            self.negociacao += conn.recv(6 - len(self.negociacao))
        self._linha(conn)
        conn.sendall(b"Password: ")
        if self._linha(conn) != self.senha_correta:
            conn.sendall(b"\r\nLogin failed\r\nUsername: ")
            conn.close()
            return
        conn.sendall(b"\r\nOLT> ")
        while (cmd := self._linha(conn)) is not None:
            if cmd == "show version":
                conn.sendall(b"show version\r\nVersion 1.0\r\n--More--")
                conn.recv(1)
                conn.sendall(b"\r\nBuild 42\r\nOLT> ")
            elif cmd == "bad":
                conn.sendall(b"bad\r\n Unknown command\r\nOLT> ")
            else:
                conn.sendall(cmd.encode() + b"\r\nOLT> ")
        conn.close()


class TestTelnet(unittest.TestCase):
    def test_login_paginacao_e_negociacao(self):
        srv = ServidorTelnetFalso()
        srv.start()
        sessao = abrir_sessao("telnet", "127.0.0.1", srv.porta, "admin", "certa", timeout=5, padroes_erro=[r"Unknown command"])
        try:
            saida = sessao.enviar("show version")
            self.assertIn("Version 1.0", saida)
            self.assertIn("Build 42", saida)
            with self.assertRaises(ErroOLT):
                sessao.enviar("bad")
        finally:
            sessao.fechar()
        self.assertEqual(srv.negociacao, bytes([IAC, DO, ECHO, IAC, WONT, 24]))

    def test_senha_errada(self):
        srv = ServidorTelnetFalso()
        srv.start()
        with self.assertRaises(ErroOLT):
            abrir_sessao("telnet", "127.0.0.1", srv.porta, "admin", "errada", timeout=5)

    def test_protocolo_desconhecido(self):
        with self.assertRaises(ErroOLT):
            abrir_sessao("http", "127.0.0.1", 80, "a", "b")


if __name__ == "__main__":
    unittest.main()
