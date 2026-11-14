import { Suspense } from "react";
import { requirePanel, type PanelRole } from "@/lib/panels/server";
import { PanelShell, PanelCard } from "./shell";
import { CreateOrganization } from "./create-organization";

type Relationship = { id: string; organization_id: string; professional_user_id: string; student_user_id: string; status: string };
async function Content({ role }: { role: PanelRole }) {
  const { client, userId, permissions } = await requirePanel(role);
  const title = role === "administrator" ? "Administração da Plataforma JA" : role === "professional" ? "Meu painel profissional" : "Meu painel de aluno";
  if (role === "administrator") {
    const access = await client.rpc("ja_record_admin_access");
    if (access.error) return <p role="alert">Acesso indisponível. Não foi possível registrar a auditoria.</p>;
    const organizations = await client.from("organizations").select("id,name,status").order("created_at", { ascending: false }).limit(100);
    return <PanelShell title={title} permissions={permissions}><PanelCard title="Organizações">{organizations.error ? <p role="alert">Não foi possível consultar as organizações.</p> : <><ul className="space-y-3">{organizations.data.map((org) => <li key={org.id}>{org.name} — {org.status}</li>)}</ul>{organizations.data.length === 0 && <p>Nenhuma organização cadastrada.</p>}<p className="mt-3 text-sm">Até 100 organizações recentes. A gestão não libera dados assistenciais. Para atuar como profissional, é necessário vínculo profissional separado.</p><CreateOrganization /></>}</PanelCard></PanelShell>;
  }
  const relationships = await client.from("care_relationships").select("id,organization_id,professional_user_id,student_user_id,status")
    .eq(role === "professional" ? "professional_user_id" : "student_user_id", userId).order("created_at", { ascending: false }).limit(100);
  return <PanelShell title={title} permissions={permissions}><PanelCard title={role === "professional" ? "Meus acompanhamentos" : "Meus vínculos profissionais"}>
    {relationships.error ? <p role="alert">Não foi possível consultar os vínculos. Tente novamente.</p> : <><p>Até 100 vínculos recentes. Identificadores são exibidos sem consultar perfis privados ou compartilhar históricos.</p><ul className="mt-4 space-y-4">{(relationships.data as Relationship[]).map((item) => <li key={item.id} className="break-all rounded-lg border border-white/15 p-4"><p>Vínculo: {item.id}</p><p>Organização: {item.organization_id}</p><p>{role === "professional" ? "Aluno" : "Profissional"}: {role === "professional" ? item.student_user_id : item.professional_user_id}</p><p>Estado: {item.status}</p></li>)}</ul>{relationships.data.length === 0 && <p className="mt-4">Nenhum acompanhamento autorizado disponível.</p>}</>}
    </PanelCard><PanelCard title="Próximas entregas"><p>Triagem persistente, anamnese, avaliações e prescrição ainda não estão disponíveis neste painel. Não envie dados reais.</p></PanelCard></PanelShell>;
}
export function ProtectedPanel({ role }: { role: PanelRole }) {
  return <Suspense fallback={<p>Verificando acesso…</p>}><Content role={role} /></Suspense>;
}
