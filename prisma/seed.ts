import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEVICE_MODELS = [
  {
    manufacturer: "Huawei",
    modelName: "EG8145V5",
    notes:
      "ONT GPON residencial, uma das mais utilizadas em provedores de pequeno/médio porte.",
    limitations: [
      {
        title: "Perda de parâmetros customizados após reboot remoto via TR-069",
        category: "PARAMETROS_TR069",
        severity: "ALTA",
        description:
          "Em alguns firmwares, parâmetros aplicados via TR-069 (SSID, senha Wi-Fi, VLAN) voltam ao padrão de fábrica após um comando de Reboot enviado pelo ACS.",
        affectedFirmware: "V5R020C10 até V5R021C00",
        workaround:
          "Reaplicar os parâmetros logo após o reboot com um Download/Apply agendado, ou atualizar para V5R021C10 ou superior.",
        status: "CONHECIDO",
        referenceLink: null,
      },
      {
        title: "Rádio 5GHz reinicia com muitos clientes conectados",
        category: "WIFI",
        severity: "MEDIA",
        description:
          "Com mais de ~20 clientes simultâneos na rede 5GHz, o rádio reinicia sozinho, derrubando todos os clientes por alguns segundos.",
        affectedFirmware: "Todas as versões testadas até o momento",
        workaround:
          "Reduzir a largura de banda do canal de 80MHz para 40MHz diminui a frequência do problema.",
        status: "EM_ANALISE",
        referenceLink: null,
      },
    ],
  },
  {
    manufacturer: "ZTE",
    modelName: "F670L",
    notes: "ONT GPON com 4 portas Gigabit, comum em redes FTTH.",
    limitations: [
      {
        title: "Não aceita InformInterval abaixo de 300 segundos",
        category: "PARAMETROS_TR069",
        severity: "BAIXA",
        description:
          "O equipamento ignora silenciosamente valores de PeriodicInformInterval menores que 300s, mantendo o último valor válido aplicado.",
        affectedFirmware: "V2.1 e anteriores",
        workaround: "Utilizar 300s como intervalo mínimo para este modelo.",
        status: "CONHECIDO",
        referenceLink: null,
      },
      {
        title: "Provisionamento via ACS não aplica VLAN de voz corretamente",
        category: "PROVISIONAMENTO",
        severity: "CRITICA",
        description:
          "Ao provisionar via TR-069 um perfil com VLAN de voz diferente da VLAN de dados, o equipamento aplica a VLAN de dados nas duas interfaces, quebrando o serviço de voz.",
        affectedFirmware: "V2.0.x",
        workaround:
          "Configurar a VLAN de voz manualmente pela interface local após o provisionamento, ou aguardar atualização de firmware.",
        status: "EM_ANALISE",
        referenceLink: null,
      },
    ],
  },
  {
    manufacturer: "Nokia",
    modelName: "G-140W-C",
    notes: "ONT GPON com Wi-Fi dual-band, ex-Alcatel-Lucent.",
    limitations: [
      {
        title: "Atualização de firmware via TR-069 falha em ~10% das tentativas",
        category: "ATUALIZACAO_FIRMWARE",
        severity: "ALTA",
        description:
          "O Download de firmware via TR-069 falha intermitentemente sem motivo aparente, exigindo reenvio do comando pelo ACS.",
        affectedFirmware: "Todas as versões",
        workaround:
          "Configurar o ACS para reenviar automaticamente o Download em caso de falha (retry).",
        status: "CONHECIDO",
        referenceLink: null,
      },
      {
        title: "Diagnóstico de linha (DLM) não reporta via TR-069",
        category: "DIAGNOSTICO",
        severity: "BAIXA",
        description:
          "Os parâmetros de diagnóstico de linha ótica não são expostos corretamente no modelo de dados TR-069, exigindo acesso via Telnet/SSH para diagnóstico completo.",
        affectedFirmware: "Todas as versões",
        workaround: null,
        status: "RESOLVIDO",
        referenceLink: null,
      },
    ],
  },
  {
    manufacturer: "Fiberhome",
    modelName: "AN5506-04-FA",
    notes: "ONT GPON com 4 portas Ethernet, sem Wi-Fi.",
    limitations: [
      {
        title: "Reboot agendado via TR-069 não respeita o horário configurado",
        category: "PARAMETROS_TR069",
        severity: "MEDIA",
        description:
          "Reboots agendados com ScheduleReboot às vezes são executados imediatamente em vez de aguardar o horário informado.",
        affectedFirmware: "RP2613 e anteriores",
        workaround:
          "Evitar o uso de ScheduleReboot; utilizar Reboot imediato em horários de baixo uso, disparado manualmente ou por rotina externa ao equipamento.",
        status: "CONHECIDO",
        referenceLink: null,
      },
    ],
  },
  {
    manufacturer: "TP-Link",
    modelName: "Archer VR400",
    notes: "Roteador VDSL/ADSL com suporte a TR-069, usado em provedores xDSL.",
    limitations: [
      {
        title: "Segurança: aceita conexão do ACS sem validar certificado em HTTPS",
        category: "SEGURANCA",
        severity: "CRITICA",
        description:
          "Quando configurado para usar ConnectionRequestURL em HTTPS, o equipamento não valida corretamente o certificado do ACS, permitindo potencial ataque man-in-the-middle na rede local.",
        affectedFirmware: "Todas as versões até o momento do cadastro",
        workaround:
          "Manter a comunicação com o ACS restrita a redes de gerência confiáveis (VLAN de gerência isolada) até que o fabricante corrija o comportamento.",
        status: "EM_ANALISE",
        referenceLink: null,
      },
    ],
  },
] as const;

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@ixcacs.local")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Administrador",
    },
  });
  console.log(`Usuário admin disponível: ${adminEmail} / senha definida em ADMIN_PASSWORD`);

  for (const { limitations, ...modelData } of DEVICE_MODELS) {
    const model = await prisma.deviceModel.upsert({
      where: {
        manufacturer_modelName: {
          manufacturer: modelData.manufacturer,
          modelName: modelData.modelName,
        },
      },
      update: {},
      create: modelData,
    });

    for (const limitation of limitations) {
      const alreadyExists = await prisma.limitation.findFirst({
        where: { deviceModelId: model.id, title: limitation.title },
      });
      if (!alreadyExists) {
        await prisma.limitation.create({
          data: { ...limitation, deviceModelId: model.id },
        });
      }
    }
  }

  console.log(`Seed concluído: ${DEVICE_MODELS.length} modelos de exemplo.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
