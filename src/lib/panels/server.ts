import "server-only";
import { notFound, redirect } from "next/navigation";
import { authClient } from "@/lib/auth/server";

export type PanelRole = "administrator" | "professional" | "student";
export type PanelContext = {
  active: boolean; owner_candidate: boolean; administrator: boolean;
  professional: boolean; student: boolean;
};

// Never cache authorization across requests or trust user_metadata / client role hints.
export async function panelSession() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at) return null;
  const result = await client.rpc("ja_panel_context");
  const value: unknown = result.data;
  if (result.error || !value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = ["active", "owner_candidate", "administrator", "professional", "student"] as const;
  if (!keys.every((key) => typeof record[key] === "boolean") || !record.active) return null;
  return { client, userId: data.user.id, permissions: record as PanelContext };
}

export async function requirePanel(role: PanelRole) {
  let session: Awaited<ReturnType<typeof panelSession>> = null;
  try { session = await panelSession(); } catch { /* Database/Auth unavailable: deny. */ }
  if (!session) redirect("/conta?status=access-unavailable");
  if (role === "administrator" && session.permissions.owner_candidate && !session.permissions.administrator) redirect("/seguranca/mfa");
  if (!session.permissions[role]) notFound();
  return session;
}

export async function requireOwnerCandidate() {
  let session: Awaited<ReturnType<typeof panelSession>> = null;
  try { session = await panelSession(); } catch { /* Fail closed. */ }
  if (!session?.permissions.owner_candidate) notFound();
  return session;
}
