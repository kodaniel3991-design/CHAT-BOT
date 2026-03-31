import { SignJWT, jwtVerify } from "jose";

function secretKey(): Uint8Array {
  const s =
    process.env.CHAT_JWT_SECRET ??
    (process.env.NODE_ENV === "production"
      ? ""
      : "dev-only-secret-min-32-chars-long!!");
  if (!s || s.length < 16) {
    throw new Error("CHAT_JWT_SECRET must be at least 16 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signAccessToken(sub: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyAccessToken(
  token: string
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : "user";
    return { sub };
  } catch {
    return null;
  }
}
