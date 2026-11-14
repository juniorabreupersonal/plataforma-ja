"use server";
import { revalidatePath } from "next/cache";
import { panelSession, requirePanel } from "@/lib/panels/server";

export async function createOrganization(_state: { message: string }, form: FormData) {
  const { client } = await requirePanel("administrator");
  const name = form.get("name");
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 160) return { message: "Informe um nome com até 160 caracteres." };
  try {
    const { error } = await client.rpc("ja_create_organization", { p_name: name.trim() });
    if (error) return { message: "Não foi possível criar a organização. Verifique sua autorização e tente novamente." };
    revalidatePath("/administrador");
    return { message: "Organização criada." };
  } catch { return { message: "Serviço indisponível. Tente novamente." }; }
}

// Aceitar apenas um convite previamente emitido não concede uma função escolhida pelo navegador.
export async function acceptInvitation(_state: { message: string }, form: FormData) {
  let session;
  try { session = await panelSession(); } catch { /* Fail closed. */ }
  if (!session) return { message: "Não foi possível validar seu acesso." };
  const id = form.get("id");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { message: "Convite inválido." };
  try {
    const { error } = await session.client.rpc("ja_accept_membership", { p_id: id });
    if (error) return { message: "Convite indisponível ou sem autorização. Nenhuma função foi atribuída por este formulário." };
    revalidatePath("/conta");
    return { message: "Convite aceito. Seu painel está disponível conforme as permissões vigentes." };
  } catch { return { message: "Serviço indisponível. Tente novamente." }; }
}
