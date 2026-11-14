import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireOwnerCandidate } from "@/lib/panels/server";
import { PanelShell, PanelCard } from "@/components/paineis/shell";
import { MfaForm } from "@/components/paineis/mfa-form";
async function Content() {
  const { permissions } = await requireOwnerCandidate();
  if (permissions.administrator) redirect("/administrador");
  return <PanelShell title="Confirmar identidade" permissions={permissions}><PanelCard title="Autenticação adicional"><p className="mb-4">Utilize o autenticador previamente habilitado pelo procedimento restrito.</p><MfaForm /></PanelCard></PanelShell>;
}
export default function Page() { return <Suspense fallback={<p>Verificando acesso…</p>}><Content /></Suspense>; }
