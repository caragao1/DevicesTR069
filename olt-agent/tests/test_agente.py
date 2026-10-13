import json
import threading
import unittest
import urllib.error
import urllib.request

from agente import criar_servidor
from tests.test_conexao import ServidorTelnetFalso

TOKEN = "token-de-teste-1234567890"
DEMO = {"driver": "demo", "host": "10.0.0.1", "porta": 22, "protocolo": "ssh", "usuario": "root", "senha": "x"}


class TestAgente(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.servidor = criar_servidor("127.0.0.1", 0, TOKEN)
        cls.url = f"http://127.0.0.1:{cls.servidor.server_address[1]}"
        threading.Thread(target=cls.servidor.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.servidor.server_close()

    def chamar(self, caminho, corpo=None, token=TOKEN):
        dados = json.dumps(corpo).encode() if corpo is not None else None
        req = urllib.request.Request(self.url + caminho, data=dados, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_exige_token(self):
        self.assertEqual(self.chamar("/saude", token="errado")[0], 401)
        self.assertEqual(self.chamar("/saude"), (200, {"ok": True, "versao": "1.0"}))

    def test_drivers_descreve_formularios(self):
        status, corpo = self.chamar("/drivers")
        self.assertEqual(status, 200)
        hsgq = next(d for d in corpo["drivers"] if d["chave"] == "hsgq")
        self.assertIn("reiniciar", hsgq["acoes_nao_homologadas"])
        line = next(r for r in hsgq["recursos"] if r["chave"] == "line")
        self.assertEqual(line["nao_homologado"], ["remover"])
        tconts = next(c for c in line["campos"] if c["nome"] == "tconts")
        self.assertEqual(tconts["subcampos"][1]["origem"], "dba")
        self.assertIn("dba", corpo["textos"]["glossario"])

    def test_leituras_demo(self):
        _, corpo = self.chamar("/onus", {"olt": DEMO})
        self.assertEqual(len(corpo["onus"]), 4)
        offline = next(o for o in corpo["onus"] if o["onu_id"] == 2)
        self.assertEqual((offline["classe_sinal"], offline["queda_traduzida"]), ("offline", "Perda de sinal óptico (fibra/conector)"))
        self.assertEqual(len(self.chamar("/pendentes", {"olt": DEMO})[1]["pendentes"]), 2)
        self.assertEqual(len(self.chamar("/recursos/listar", {"olt": DEMO, "recurso": "line"})[1]["itens"]), 2)
        self.assertEqual(self.chamar("/onu", {"olt": DEMO, "pon": 1, "onu_id": 0})[1]["detalhes"]["line_profile_id"], 0)
        opcoes = self.chamar("/opcoes", {"olt": DEMO, "origens": ["line", "inexistente"]})[1]["opcoes"]
        self.assertEqual(opcoes["line"][1], ["100", "100 — 100M"])
        self.assertEqual(opcoes["inexistente"], [])
        coleta = self.chamar("/coletar", {"olt": DEMO})[1]
        self.assertEqual((len(coleta["onus"]), coleta["pendentes"]), (4, 2))

    def test_previa_resolve_id_e_mascara_senha(self):
        operacao = {"acao": "autorizar", "dados": {"pon": "1", "sn": "XPON6a7b8c9d", "line_profile_id": "100", "srv_profile_id": "0",
                                                    "wan_modo": "pppoe", "vlan": "2002", "pppoe_usuario": "cli", "pppoe_senha": "segredo"}}
        status, corpo = self.chamar("/comandos", {"olt": DEMO, "operacao": operacao, "salvar": True})
        self.assertEqual(status, 200)
        self.assertEqual(corpo["operacao"]["dados"]["onu_id"], "3")
        self.assertIn("ont add 3 sn-auth 58504f4e6a7b8c9d omci ont-lineprofile-id 100 ont-srvprofile-id 0", corpo["comandos"])
        self.assertEqual(corpo["comandos"][-1], "save")
        self.assertNotIn("segredo", json.dumps(corpo["comandos"]))
        status, resultado = self.chamar("/executar", {"olt": DEMO, "operacao": corpo["operacao"]})
        self.assertEqual(status, 200)
        self.assertTrue(resultado["sucesso"])

    def test_executar_autorizacao_sem_previa_recusa(self):
        status, corpo = self.chamar("/executar", {"olt": DEMO, "operacao": {"acao": "autorizar", "dados": {"pon": "1"}}})
        self.assertEqual(status, 422)
        self.assertTrue(any("onu_id" in e for e in corpo["erros"]))

    def test_validacao_e_avisos(self):
        status, corpo = self.chamar("/comandos", {"olt": DEMO, "operacao": {"acao": "criar", "recurso": "dba", "dados": {"id": "5", "nome": "x", "tipo": "type4"}}})
        self.assertEqual(status, 422)
        self.assertTrue(any(e.startswith("id:") for e in corpo["erros"]))
        self.assertTrue(any(e.startswith("max:") for e in corpo["erros"]))
        _, corpo = self.chamar("/comandos", {"olt": DEMO, "operacao": {"acao": "remover", "recurso": "dba", "item_id": "10"}})
        self.assertEqual((corpo["comandos"], corpo["nao_homologado"]), (["dba-profile delete profile-id 10"], True))
        self.assertEqual(self.chamar("/comandos", {"olt": DEMO, "operacao": {"acao": "remover", "recurso": "sip", "item_id": "0"}})[0], 422)
        _, corpo = self.chamar("/comandos", {"olt": DEMO, "operacao": {"acao": "script", "comandos": ["show version", " "]}})
        self.assertEqual(corpo["comandos"], ["show version"])

    def test_erros_de_requisicao(self):
        self.assertEqual(self.chamar("/onus", {})[0], 400)
        self.assertEqual(self.chamar("/nada", {"olt": DEMO})[0], 404)
        self.assertEqual(self.chamar("/onus", {"olt": DEMO | {"driver": "xyz"}})[0], 422)
        status, corpo = self.chamar("/testar", {"olt": DEMO | {"driver": "hsgq", "host": "127.0.0.1", "porta": 1}})
        self.assertEqual(status, 502)
        self.assertIn("Falha ao conectar", corpo["erro"])

    def test_telnet_real_com_sessao_reaproveitada(self):
        srv = ServidorTelnetFalso()
        srv.start()
        olt = {"driver": "hsgq", "host": "127.0.0.1", "porta": srv.porta, "protocolo": "telnet", "usuario": "admin", "senha": "certa"}
        self.assertEqual(self.chamar("/testar", {"olt": olt})[0], 200)
        _, corpo = self.chamar("/comandos", {"olt": olt, "operacao": {"acao": "script", "comandos": ["show version"]}})
        status, resultado = self.chamar("/executar", {"olt": olt, "operacao": {"acao": "script", "comandos": ["show version"]}})
        self.assertEqual(status, 200)
        self.assertIn("Build 42", resultado["saidas"][0])


if __name__ == "__main__":
    unittest.main()
