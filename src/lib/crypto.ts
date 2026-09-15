import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import "server-only";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.ACS_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ACS_TOKEN_ENCRYPTION_KEY não está configurado.");
  }
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error("ACS_TOKEN_ENCRYPTION_KEY deve ser uma chave de 32 bytes em base64.");
  }
  return key;
}

// Criptografia simétrica autenticada (AES-256-GCM) para segredos guardados
// no banco (hoje só o bearer token do ACS) — mesmo com acesso de leitura ao
// banco, o segredo em si não fica exposto sem a chave (só em variável de
// ambiente, nunca no banco).
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de dado criptografado inválido.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
