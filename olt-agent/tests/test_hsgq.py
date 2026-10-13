import unittest
from pathlib import Path

from olt_manager.drivers.hsgq import parsers
from olt_manager.drivers.hsgq.driver import DriverHSGQ, ErroValidacao

FIX = Path(__file__).parent / "fixtures" / "hsgq"


def ler(nome):
    with open(FIX / nome, encoding="utf-8", newline="") as arquivo:
        return arquivo.read()


class TestParsers(unittest.TestCase):
    def test_ont_info(self):
        onus = parsers.parse_ont_info(ler("ont_info.txt"))
        self.assertEqual(len(onus), 1)
        onu = onus[0]
        self.assertEqual((onu["pon"], onu["onu_id"]), (1, 0))
        self.assertEqual(onu["sn"], "XPON5259fb4e")
        self.assertEqual(onu["estado"], "Active")
        self.assertTrue(onu["online"])
        self.assertEqual(onu["match_state"], "Initial")
        self.assertEqual(onu["ultima_queda"], "")
        self.assertEqual(onu["nome"], "ONT01/000")

    def test_ont_optical(self):
        sinal = parsers.parse_ont_optical(ler("ont_optical.txt"))
        self.assertEqual(len(sinal), 1)
        s = sinal[0]
        self.assertEqual(s["sn"], "XPON5259fb4e")
        self.assertAlmostEqual(s["rx_dbm"], -5.776)
        self.assertAlmostEqual(s["olt_rx_dbm"], -13.0103)
        self.assertAlmostEqual(s["tx_dbm"], 2.468)
        self.assertEqual(s["temperatura_c"], 37.0)

    def test_ont_optical_modo_config_sem_olt_rx(self):
        sinal = parsers.parse_ont_optical(ler("ont_optical_config.txt"))
        self.assertEqual(len(sinal), 1)
        self.assertAlmostEqual(sinal[0]["rx_dbm"], -5.678)
        self.assertIsNone(sinal[0]["olt_rx_dbm"])
        self.assertEqual(sinal[0]["nome"], "ONT01/000")

    def test_onu_offline_por_falta_de_energia(self):
        onu = parsers.parse_ont_info(ler("ont_info_offline.txt"))[0]
        self.assertFalse(onu["online"])
        self.assertEqual(onu["ultima_queda"], "Power down")
        self.assertEqual(onu["config_state"], "initial")

    def test_optical_sem_onu_online(self):
        self.assertEqual(parsers.parse_ont_optical(ler("ont_optical_nenhuma_online.txt")), [])

    def test_autofind_sem_pendentes(self):
        self.assertEqual(parsers.parse_ont_autofind(ler("autofind_sem_pendentes.txt")), [])

    def test_autofind_vazio(self):
        self.assertEqual(parsers.parse_ont_autofind(ler("autofind_vazio.txt")), [])

    def test_perfis(self):
        p = parsers.parse_perfis(ler("perfis.txt"))
        self.assertEqual([d["nome"] for d in p["dba"]], ["100M", "500M"])
        self.assertEqual(p["dba"][0]["tipo"], "type4")
        self.assertEqual(p["dba"][0]["parametros"], {"max": 100000})
        self.assertEqual([l["id"] for l in p["line"]], [0, 100])
        self.assertEqual(p["line"][1]["tconts"], [{"tcont": 1, "dba_profile_id": 10}])
        self.assertEqual(p["line"][1]["mapeamentos"][0]["regra"], "vlan transparent")
        self.assertEqual(p["srv"][0]["nome"], "srvprofile_default_0")
        self.assertIn("port vlan eth 1 transparent", p["srv"][0]["linhas"])
        self.assertEqual(len(p["sip"]), 2)
        self.assertEqual(p["tr069"][0]["url"], "http://ixcacs.com.br/tr069")

    def test_config_gpon(self):
        pons = parsers.parse_config_gpon(ler("config_gpon.txt"))
        self.assertEqual(set(pons), {1, 2})
        onu = pons[1]["onus"][0]
        self.assertEqual(onu["sn"], "XPON5259fb4e")
        self.assertEqual((onu["line_profile_id"], onu["srv_profile_id"]), (0, 0))
        wan = [c for c in onu["comandos"] if "wanconfig" in c][0]
        self.assertIn("pppoe teste.ixcsoft ******", wan)
        self.assertNotIn(" 123 ", wan)
        self.assertTrue(pons[1]["autofind"])
        self.assertIn("ont authorize auto", pons[2]["autorizacao_auto"])

    def test_conversao_serial(self):
        self.assertEqual(parsers.sn_hex_para_str("58504f4e5259fb4e"), "XPON5259fb4e")
        self.assertEqual(parsers.sn_str_para_hex("XPON5259fb4e"), "58504f4e5259fb4e")
        self.assertEqual(
            parsers.sn_str_para_hex("58504F4E5259FB4E"), "58504f4e5259fb4e"
        )

    def test_limpar_backspace_e_ansi(self):
        self.assertEqual(parsers.limpar("\x1b[01;32mshoww\x08 run\r\n"), "show run\n")


class TestTemplates(unittest.TestCase):
    def setUp(self):
        self.driver = DriverHSGQ("0.0.0.0", 22, "x", "x")

    def test_autorizacao_reproduz_config_real(self):
        comandos = self.driver.gerar_autorizacao(
            {
                "pon": 1,
                "onu_id": 0,
                "sn": "XPON5259fb4e",
                "line_profile_id": 0,
                "srv_profile_id": 0,
                "wan_modo": "pppoe",
                "vlan": 2002,
                "pppoe_usuario": "teste.ixcsoft",
                "pppoe_senha": "123",
                "acesso_remoto_http": 9090,
            }
        )
        self.assertEqual(
            comandos,
            [
                "interface gpon 1",
                "ont add 0 sn-auth 58504f4e5259fb4e omci ont-lineprofile-id 0 ont-srvprofile-id 0",
                "ont wanconfig add 0 connection-type internet vlan tag 2002 ipmode pppoe teste.ixcsoft 123 lan_eth 1-4 lan_ssid 1-4 lan_ssid5g 1-4 ipprotocol ipv46",
                "ont wan-remoteconfig 0 http enable 9090",
                "exit",
            ],
        )

    def test_autorizacao_bridge_com_nome_e_wifi(self):
        comandos = self.driver.gerar_autorizacao(
            {
                "pon": 2,
                "onu_id": 5,
                "sn": "XPON00000001",
                "line_profile_id": 100,
                "srv_profile_id": 0,
                "nome": "cliente_joao",
                "descricao": "Rua A 123",
                "wan_modo": "bridge",
                "vlan": 300,
                "wifi_24_ssid": "Casa",
                "wifi_5_ssid": "Casa5G",
                "wifi_senha": "segredo123",
            }
        )
        self.assertIn("ont setting 5 name cliente_joao desc Rua A 123", comandos)
        self.assertIn("ont port native-vlan 5 eth 1 vlan 300", comandos)
        self.assertIn(
            "ont wlanconfig 5 2_4g Casa wpa2 segredo123 5g Casa5G wpa2 segredo123",
            comandos,
        )

    def test_validacao(self):
        with self.assertRaises(ErroValidacao) as ctx:
            self.driver.gerar_autorizacao(
                {
                    "pon": 3,
                    "onu_id": 200,
                    "sn": "abc",
                    "line_profile_id": 0,
                    "srv_profile_id": 0,
                    "wan_modo": "pppoe",
                },
                consultar_id_livre=False,
            )
        msg = str(ctx.exception)
        for trecho in ("onu_id", "sn:", "vlan", "pppoe"):
            self.assertIn(trecho, msg)

    def test_desautorizacao(self):
        self.assertEqual(
            self.driver.gerar_desautorizacao(1, 7),
            ["interface gpon 1", "ont delete 7", "exit"],
        )

    def test_criacao_perfis(self):
        self.assertEqual(
            self.driver.gerar_criacao(
                "dba", {"id": 12, "nome": "1G", "tipo": "type4", "max": 1000000}
            ),
            ["dba-profile add profile-id 12 profile-name 1G type4 max 1000000"],
        )
        line = self.driver.gerar_criacao(
            "line",
            {
                "id": 101,
                "nome": "500M",
                "tconts": [{"tcont": 1, "dba_profile_id": 11}],
                "gems": [{"gem": 1, "tcont": 1}],
                "mapeamentos": [{"gem": 1, "indice": 1, "regra": "vlan transparent"}],
            },
        )
        self.assertEqual(
            line,
            [
                "ont-lineprofile gpon profile-id 101 profile-name 500M",
                "tcont 1 dba-profile-id 11",
                "gem add 1 tcont 1",
                "gem mapping 1 1 vlan transparent",
                "commit",
                "exit",
            ],
        )
        self.assertEqual(
            self.driver.gerar_criacao(
                "traffic", {"id": 2, "nome": "200M", "cir": 200000, "pir": 200000}
            ),
            [
                "ont-traffic-profile add profile-id 2 profile-name 200M cir 200000 pir 200000"
            ],
        )

    def test_simulacao_mascara_senha(self):
        comandos = self.driver.gerar_autorizacao(
            {
                "pon": 1,
                "onu_id": 3,
                "sn": "XPON5259fb4e",
                "line_profile_id": 0,
                "srv_profile_id": 0,
                "wan_modo": "pppoe",
                "vlan": 2002,
                "pppoe_usuario": "u",
                "pppoe_senha": "senhaforte",
            }
        )
        resultado = self.driver.executar(comandos, simular=True, salvar=True)
        self.assertTrue(resultado.simulado)
        self.assertEqual(resultado.comandos[-1], "save")
        self.assertNotIn("senhaforte", "\n".join(resultado.comandos))

    def test_criacao_srv_e_tr069(self):
        self.assertEqual(
            self.driver.gerar_criacao("srv", {"id": 5, "nome": "bridge", "portas_vlan": [{"porta": 1, "regra": "transparent"}]}),
            ["ont-srvprofile gpon profile-id 5 profile-name bridge", "ont-port eth adaptive", "port vlan eth 1 transparent", "commit", "exit"],
        )
        tr069 = self.driver.gerar_criacao("tr069", {"id": 2, "nome": "ACS", "url": "http://acs:7547", "usuario": "u", "senha": "segredo"})
        self.assertEqual(tr069, ["ont-tr069-profile add profile-id 2 profile-name ACS url http://acs:7547 user u password segredo"])
        self.assertNotIn("segredo", self.driver.executar(tr069, simular=True).comandos[0])

    def test_remocao(self):
        self.assertEqual(self.driver.gerar_remocao("dba", "10"), ["dba-profile delete profile-id 10"])
        with self.assertRaises(ErroValidacao):
            self.driver.gerar_remocao("sip", 0)

    def test_dba_exige_parametros_do_tipo(self):
        with self.assertRaises(ErroValidacao) as ctx:
            self.driver.gerar_criacao("dba", {"id": 12, "nome": "x", "tipo": "type3", "max": 1000})
        self.assertIn("assure", str(ctx.exception))

    def test_pendente_normalizado(self):
        from olt_manager.drivers.hsgq.driver import _normalizar_pendente
        item = _normalizar_pendente({"pon_onu": "2/1", "serial_number": "HWTC5e6f7a8b", "vendor": "HWTC"})
        self.assertEqual((item["pon"], item["sn"]), (2, "HWTC5e6f7a8b"))

    def test_script_personalizado(self):
        script = "interface gpon {{ pon }}\nont reboot {{ onu_id }}\nexit"
        self.assertEqual(
            self.driver.gerar_personalizado(script, {"pon": 1, "onu_id": 0}),
            ["interface gpon 1", "ont reboot 0", "exit"],
        )


if __name__ == "__main__":
    unittest.main()
