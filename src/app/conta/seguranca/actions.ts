"use server";
import { revalidatePath } from "next/cache";
import { panelSession } from "@/lib/panels/server";

export type SetupState = { message: string; factorId: string; secret: string; complete: boolean };
const empty: SetupState = { message: "", factorId: "", secret: "", complete: false };
export async function setupTotp(_state: SetupState, form: FormData): Promise<SetupState> {
  try {
    const session = await panelSession();
    // Initial enrollment must never become a password-only MFA replacement for an owner.
    if (!session || session.permissions.owner_candidate) return { ...empty, message: "Configuração indisponível para esta conta. Utilize o procedimento restrito de recuperação, se necessário." };
    const { data, error } = await session.client.auth.mfa.listFactors();
    if (error || !data || data.all.some((factor) => factor.status === "verified")) return { ...empty, message: "Já existe um fator verificado ou a configuração está indisponível. Nenhum fator foi substituído." };
    if (form.get("intent") === "start") {
      const result = await session.client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Plataforma JA" });
      if (result.error) return { ...empty, message: "Não foi possível iniciar a configuração. Tente novamente ou solicite atendimento." };
      // Auth-issued secret: deliver only to this authenticated user, never log or persist in app tables.
      return { ...empty, factorId: result.data.id, secret: result.data.totp.secret, message: "Adicione a chave ao autenticador e confirme o código." };
    }
    const factorId = form.get("factorId");
    const code = form.get("code");
    const factor = data.all.find((item) => item.id === factorId && item.factor_type === "totp" && item.status === "unverified");
    if (form.get("intent") !== "verify" || !factor || typeof code !== "string" || !/^\d{6}$/.test(code)) return { ...empty, message: "Configuração inválida. Nenhum fator foi alterado." };
    const result = await session.client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (result.error) return { ...empty, factorId: factor.id, message: "Código não confirmado. Aguarde o próximo código e tente novamente." };
    revalidatePath("/conta");
    return { ...empty, complete: true, message: "Autenticador confirmado. Nenhuma função ou permissão foi concedida." };
  } catch { return { ...empty, message: "Serviço indisponível. Nenhuma permissão foi concedida." }; }
}
