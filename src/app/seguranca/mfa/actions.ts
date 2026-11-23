"use server";
import { redirect } from "next/navigation";
import { requireOwnerCandidate } from "@/lib/panels/server";
export async function verifyMfa(_state: { message: string }, form: FormData) {
  const { client } = await requireOwnerCandidate();
  const code = form.get("code");
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return { message: "Informe os seis dígitos do autenticador." };
  let verified = false;
  try {
    const { data, error } = await client.auth.mfa.listFactors();
    const factor = data?.totp.find((item) => item.status === "verified");
    if (error || !factor) return { message: "Autenticador indisponível. Utilize o procedimento restrito de recuperação de acesso." };
    const result = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    verified = !result.error;
  } catch { /* Never disclose factors, codes, tokens or provider details. */ }
  if (!verified) return { message: "Não foi possível validar o código. Aguarde o próximo código e tente novamente." };
  redirect("/administrador");
}
