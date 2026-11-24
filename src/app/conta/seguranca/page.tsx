import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { panelSession } from "@/lib/panels/server";
import { PanelShell, PanelCard } from "@/components/paineis/shell";
import { TotpSetup } from "@/components/paineis/totp-setup";
async function Content() {
  let session;
  try { session = await panelSession(); } catch { /* Fail closed. */ }
  if (!session) redirect("/conta");
  if (session.permissions.owner_candidate) notFound();
  return <PanelShell title="Configurar autenticador" permissions={session.permissions}><PanelCard title="Configuração inicial TOTP"><p className="mb-4">Esta configuração protege somente a sua identidade. Não concede função profissional ou administrativa e não substitui fatores já verificados.</p><TotpSetup /></PanelCard></PanelShell>;
}
export default function Page() { return <Suspense fallback={<p>Verificando acesso…</p>}><Content /></Suspense>; }
