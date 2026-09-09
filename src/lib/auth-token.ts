import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ixc_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não está configurado.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_SECONDS;
