# Agente de OLTs

Serviço Python que executa as operações da aba **OLT** do DevicesTR069. Ele roda
num servidor **dentro da rede das OLTs**, abre as sessões SSH/Telnet e devolve
os dados em JSON. Não guarda nada: cadastro, coletas e histórico ficam no banco
da aplicação, e cada requisição traz os dados de conexão da OLT.

```
Navegador ──> DevicesTR069 (Next.js) ──HTTP + token──> agente ──SSH/Telnet──> OLTs
```

## Rodando

Requer Python 3.11+.

```bash
cd olt-agent
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
OLT_AGENT_TOKEN="$(openssl rand -hex 32)" python agente.py
```

| Variável | Padrão | Para quê |
|---|---|---|
| `OLT_AGENT_TOKEN` | — (obrigatória, ≥ 16 caracteres) | Token que a aplicação envia em `Authorization: Bearer`. Mesmo valor de `OLT_AGENT_TOKEN` no `.env` do Next.js. |
| `OLT_AGENT_HOST` | `127.0.0.1` | Interface onde escuta. Use `0.0.0.0` só se a aplicação estiver em outra máquina, e restrinja no firewall. |
| `OLT_AGENT_PORT` | `8770` | Porta HTTP. |
| `OLT_TIMEOUT` | `15` | Segundos de espera por resposta de cada comando na OLT. |

O agente fala HTTP sem TLS: deixe-o em `127.0.0.1` na mesma máquina da
aplicação, ou atrás de um proxy com HTTPS / VPN se ficar em outra máquina.

### Como serviço (systemd)

```ini
# /etc/systemd/system/olt-agent.service
[Unit]
Description=Agente de OLTs do DevicesTR069
After=network-online.target

[Service]
WorkingDirectory=/opt/devicestr069/olt-agent
Environment=OLT_AGENT_TOKEN=coloque-o-token-aqui
ExecStart=/opt/devicestr069/olt-agent/.venv/bin/python agente.py
Restart=always
User=olt-agent

[Install]
WantedBy=multi-user.target
```

## API

Todas as rotas exigem o token. As que falam com uma OLT recebem
`{"olt": {"driver", "host", "porta", "protocolo", "usuario", "senha"}, ...}`.

| Rota | O que faz |
|---|---|
| `GET /saude` | Agente no ar. |
| `GET /drivers` | Drivers disponíveis, com os campos de cada formulário, os recursos (perfis) e os textos explicativos. A interface monta as telas a partir disso. |
| `POST /testar` | Conecta e entra em modo de configuração. |
| `POST /onus` | ONUs autorizadas com estado e sinal (`pon`, `olt_rx` opcionais). |
| `POST /onu` | Uma ONU: estado atual e provisionamento (`pon`, `onu_id`). |
| `POST /pendentes` | ONUs no autofind. |
| `POST /recursos/listar` | Itens de um recurso (`recurso`: dba, line, srv...). |
| `POST /opcoes` | Itens existentes para preencher listas (`origens`). |
| `POST /comandos` | **Prévia**: valida e gera os comandos de uma `operacao`, com senhas mascaradas. Não envia nada à OLT. |
| `POST /executar` | Gera de novo os comandos da `operacao` e executa (`salvar` acrescenta `save`). |
| `POST /coletar` | ONUs + sinal (com Rx da OLT) + quantidade de pendentes, para o monitoramento. |

`operacao` = `{"acao": "autorizar"|"desautorizar"|"reiniciar"|"criar"|"remover"|"script", ...}`.
Erros: `422` validação (`erros: [...]`), `502` falha na OLT, `401` token.

A sessão com cada OLT é reaproveitada por até 2 minutos sem uso (o login SSH
leva segundos), refeita se cair e descartada quando um comando falha.

## Testes

```bash
python -m unittest discover -s tests -t .
```

## Homologando um novo modelo de OLT

1. Colete saídas reais da CLI (`show ...`) e guarde em `tests/fixtures/<fabricante>/`.
2. Crie `olt_manager/drivers/<fabricante>/driver.py` com uma subclasse de `DriverOLT`
   (`olt_manager/drivers/base.py`): leituras de ONU, `schema_autorizacao`,
   `recursos()` (um `Recurso` por perfil/VLAN/service-port, com campos e textos de
   ajuda) e os `gerar_*` que montam os comandos — de preferência em templates `.j2`.
3. Marque em `nao_homologado` / `acoes_nao_homologadas` o que ainda não foi
   conferido no equipamento: a interface mostra um aviso nessas operações.
4. Registre a classe em `olt_manager/drivers/__init__.py`. Ela aparece no cadastro
   de OLTs e as telas se montam sozinhas.

### Situação do driver HSGQ (G02)

Autorização, desautorização e criação de DBA, line e traffic profiles vieram de
saídas reais. Ainda **não validados** numa OLT: criação de service e TR-069
profiles, remoção de perfis e reinício de ONU (templates em
`olt_manager/drivers/hsgq/templates/`). Service-port e VLAN ainda não foram
implementados para esse modelo.
