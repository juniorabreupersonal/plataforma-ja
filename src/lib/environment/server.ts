import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { runtimeEnvironment } from "./policy.mjs";

export function serverEnvironment() { return runtimeEnvironment(process.env); }

/** Infrastructure gate only. It never grants an application identity or role. */
export function stagingAccess(authorization: string | null, secret: string | undefined) {
  if (!secret || !authorization || authorization.length > 1024 || !/^Basic [A-Za-z0-9+/]+=*$/.test(authorization)) return false;
  const provided = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(`ja-homologacao:${secret}`));
}
