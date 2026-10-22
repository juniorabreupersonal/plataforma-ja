import { Suspense } from "react";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth/server";
import { AuthShell } from "@/components/auth-shell";
import { LogoutButton } from "@/components/logout-button";

async function Account() {
  let authenticated = false;
  try {
    const client = await authClient();
    const { data, error } = await client.auth.getUser();
    authenticated = !error && Boolean(data.user?.email_confirmed_at);
  } catch { /* Falhar fechado, sem confiar em cookies não verificados. */ }
  if (!authenticated) redirect("/login");
  return <><p className="mt-6">Sua sessão foi validada. Esta conta não concede privilégios profissionais ou administrativos.</p><LogoutButton /></>;
}
export default function Page() {
  return <AuthShell title="Minha conta"><Suspense fallback={<p>Verificando sessão…</p>}><Account /></Suspense></AuthShell>;
}
