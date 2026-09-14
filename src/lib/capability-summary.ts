export type CapabilityHeadlineItem = {
  label: string;
  supported: boolean;
};

export type CapabilityGroupSummary = {
  key: string;
  groupLabel: string;
  headline: CapabilityHeadlineItem[];
  raw: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function field(obj: unknown, ...path: string[]): boolean | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[key];
  }
  return typeof cur === "boolean" ? cur : undefined;
}

// Critérios de "suportado" por grupo, definidos com o time (ver conversa):
// cada grupo tem um pequeno conjunto de campos que realmente importa no
// onboarding; o resto do JSON (secundário, e varia por fabricante) só
// aparece no detalhe expandido de cada card.
export function summarizeCapabilities(
  capabilities: Record<string, unknown>
): CapabilityGroupSummary[] {
  const groups: CapabilityGroupSummary[] = [];
  const push = (
    key: string,
    groupLabel: string,
    headline: CapabilityHeadlineItem[]
  ) => {
    if (capabilities[key] !== undefined) {
      groups.push({ key, groupLabel, headline, raw: capabilities[key] });
    }
  };

  push("FirmwareUpdate", "Atualização de firmware", [
    { label: "Atualização remota", supported: !!field(capabilities, "FirmwareUpdate", "canUpdate") },
  ]);

  push("Hosts", "Hosts conectados", [
    { label: "Lista dispositivos conectados", supported: !!field(capabilities, "Hosts", "get") },
  ]);

  if (isPlainObject(capabilities.Lan)) {
    const dhcp = isPlainObject(capabilities.Lan.dhcpServer) ? capabilities.Lan.dhcpServer : {};
    const dhcpOk = ["setGateway", "setPool", "setSubnetMask", "setDnsServer"].every(
      (k) => dhcp[k] === true
    );
    push("Lan", "Rede local (LAN)", [
      { label: "Configuração de DHCP", supported: dhcpOk },
    ]);
  }

  push("NeighborScan", "Varredura de vizinhos", [
    { label: "Executar varredura", supported: !!field(capabilities, "NeighborScan", "execute") },
  ]);

  push("Ping", "Ping", [
    { label: "Executar ping", supported: !!field(capabilities, "Ping", "execute") },
  ]);

  push("Traceroute", "Traceroute", [
    { label: "Executar traceroute", supported: !!field(capabilities, "Traceroute", "execute") },
  ]);

  if (isPlainObject(capabilities.PortForward)) {
    const pf = capabilities.PortForward;
    const ok = [
      "createRule",
      "enableRule",
      "setInternalIp",
      "setInternalPort",
      "setExternalPort",
      "setBothProtocols",
    ].every((k) => pf[k] === true);
    push("PortForward", "Redirecionamento de porta", [
      { label: "Redirecionamento de porta", supported: ok },
    ]);
  }

  if (isPlainObject(capabilities.SpeedTest)) {
    push("SpeedTest", "Teste de velocidade", [
      { label: "Download", supported: !!field(capabilities, "SpeedTest", "download", "execute") },
      { label: "Upload", supported: !!field(capabilities, "SpeedTest", "upload", "execute") },
    ]);
  }

  if (isPlainObject(capabilities.Wan)) {
    const ipv6 =
      field(capabilities, "Wan", "ip", "enableIpv6") === true ||
      field(capabilities, "Wan", "ppp", "enableIpv6") === true;
    push("Wan", "WAN", [{ label: "IPv6", supported: ipv6 }]);
  }

  if (isPlainObject(capabilities.WebManager)) {
    push("WebManager", "Acesso remoto (Web Manager)", [
      {
        label: "Acesso remoto",
        supported: !!field(capabilities, "WebManager", "remoteAccess", "enableAccess"),
      },
      {
        label: "Definir porta de acesso",
        supported: !!field(capabilities, "WebManager", "remoteAccess", "setPort"),
      },
      {
        label: "Usuário web",
        supported: !!field(capabilities, "WebManager", "webUser", "enableUser"),
      },
      {
        label: "Definir senha",
        supported: !!field(capabilities, "WebManager", "webUser", "setPassword"),
      },
    ]);
  }

  if (isPlainObject(capabilities.Wifi)) {
    const wifi = capabilities.Wifi;
    const bandOk = (band: unknown) =>
      isPlainObject(band) &&
      band.enableInterface === true &&
      band.setSsid === true &&
      band.setPassword === true;
    push("Wifi", "Wi-Fi", [
      { label: "Wi-Fi 2.4GHz", supported: bandOk(wifi["2.4"]) },
      { label: "Wi-Fi 5.8GHz", supported: bandOk(wifi["5.8"]) },
      {
        label: "Band Steering",
        supported: field(capabilities, "Wifi", "bandSteering", "setEnabled") === true,
      },
    ]);
  }

  if (isPlainObject(capabilities.TimeProtocol)) {
    push("TimeProtocol", "Data e hora", [
      { label: "Fuso horário", supported: !!field(capabilities, "TimeProtocol", "timeZone") },
    ]);
  }

  if (isPlainObject(capabilities.Capability)) {
    push("Capability", "Sistema", [
      { label: "Reiniciar (Reboot)", supported: !!field(capabilities, "Capability", "Reboot") },
      { label: "Restaurar padrão (Reset)", supported: !!field(capabilities, "Capability", "Reset") },
    ]);
  }

  // Qualquer grupo do topo que não esteja na lista acima (schema varia por
  // fabricante) ainda aparece, com um resumo genérico: suportado se todo
  // campo booleano dentro dele for true.
  const known = new Set(groups.map((g) => g.key));
  for (const [key, value] of Object.entries(capabilities)) {
    if (known.has(key) || !isPlainObject(value)) continue;
    const leaves: boolean[] = [];
    const collect = (v: unknown) => {
      if (typeof v === "boolean") leaves.push(v);
      else if (isPlainObject(v)) Object.values(v).forEach(collect);
    };
    collect(value);
    if (leaves.length === 0) continue;
    groups.push({
      key,
      groupLabel: key,
      headline: [{ label: key, supported: leaves.every(Boolean) }],
      raw: value,
    });
  }

  return groups;
}
