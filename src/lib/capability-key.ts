// Chave de uma combinação fabricante/modelo/hardware/firmware — a mesma que
// identifica um registro de capacidades (unique do EquipmentCapability).
export type CapabilityKeyParts = {
  manufacturer: string;
  modelName: string;
  hardware: string;
  firmwareVersion: string;
};

export function capabilityKey(parts: CapabilityKeyParts): string {
  return [parts.manufacturer, parts.modelName, parts.hardware, parts.firmwareVersion]
    .map((part) => part.trim())
    .join("\u0000");
}
