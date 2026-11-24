import { AcceptInvitation } from "@/components/paineis/accept-invitation";
import Link from "next/link";
import { panelSession } from "@/lib/panels/server";
import { PanelNavigation } from "@/components/paineis/shell";
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
  let session: Awaited<ReturnType<typeof panelSession>> = null;
  try { session = await panelSession(); } catch { /* No schema/permission: no panels. */ }
  const invitations = session ? await session.client.from("organization_memberships").select("id,organization_id,role").eq("user_id", session.userId).eq("status", "invited").limit(50) : null;
  return <><p className="mt-6">Sua sessão foi validada.</p>
    {session ? <><PanelNavigation permissions={session.permissions} />
      {session.permissions.owner_candidate && !session.permissions.administrator && <Link href="/seguranca/mfa" className="mt-4 block underline">Confirmar identidade</Link>}
      {!session.permissions.owner_candidate && !session.permissions.professional && !session.permissions.student && <p className="mt-4">Seu perfil básico está ativo. Os painéis dependem de habilitação e vínculo autorizado.</p>}</>
      : <p className="mt-4" role="status">Acesso aos painéis indisponível. Nenhuma permissão foi presumida. Tente novamente ou solicite atendimento.</p>}
    {session && !session.permissions.owner_candidate && <Link href="/conta/seguranca" className="mt-4 block underline">Configurar autenticador</Link>}
    {invitations && !invitations.error && invitations.data.length > 0 && <section className="mt-6"><h2 className="text-xl font-semibold">Convites pendentes</h2><p>Aceite somente vínculos que você reconheça.</p><ul className="mt-3 space-y-4">{invitations.data.map((item) => <li key={item.id} className="break-all">Organização: {item.organization_id} — {item.role}<AcceptInvitation id={item.id} /></li>)}</ul></section>}
    <LogoutButton /></>;
}
export default function Page() {
  return <AuthShell title="Minha conta"><Suspense fallback={<p>Verificando sessão…</p>}><Account /></Suspense></AuthShell>;
}
