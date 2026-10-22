"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authClient } from "@/lib/auth/server";
import { applicationOrigin, credentials, validEmail, validPassword } from "@/lib/auth/validation";

export type AuthState = { message: string };
const unavailable = { message: "Não foi possível concluir agora. Tente novamente em instantes." };

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const input = credentials(form);
  if (!input) return { message: "Informe um e-mail válido e sua senha." };
  try {
    const client = await authClient();
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.user?.email_confirmed_at) {
      if (data.session) await client.auth.signOut({ scope: "local" });
      return { message: "Não foi possível entrar. Confira os dados e a confirmação do seu e-mail." };
    }
  } catch { return unavailable; }
  redirect("/conta");
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const input = credentials(form, true);
  if (!input) return { message: "Informe um e-mail válido e uma senha entre 8 e 128 caracteres." };
  if (input.password !== form.get("confirmation")) return { message: "As senhas devem ser iguais." };
  try {
    const origin = applicationOrigin(process.env.APP_URL);
    const client = await authClient();
    const { data, error } = await client.auth.signUp({ ...input, options: { emailRedirectTo: `${origin}/auth/callback` } });
    // Não manter uma sessão automática se a confirmação estiver desabilitada no projeto.
    if (data.session) {
      await client.auth.signOut({ scope: "local" });
      return { message: "O cadastro requer confirmação de e-mail. Entre em contato com o suporte para verificar a configuração." };
    }
    if (error && !["user_already_exists", "email_exists"].includes(error.code ?? "")) return unavailable;
    return { message: "Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Confira também o spam." };
  } catch { return unavailable; }
}

export async function recover(_: AuthState, form: FormData): Promise<AuthState> {
  const email = validEmail(form.get("email"));
  if (!email) return { message: "Informe um e-mail válido." };
  try {
    const origin = applicationOrigin(process.env.APP_URL);
    const client = await authClient();
    await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?flow=recovery` });
  } catch { return unavailable; }
  return { message: "Se houver uma conta elegível, enviaremos as instruções de recuperação. Confira também o spam." };
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = validPassword(form.get("password"), true);
  if (!password || password !== form.get("confirmation")) return { message: "Use uma senha entre 8 e 128 caracteres e confirme com o mesmo valor." };
  try {
    const client = await authClient();
    const { data, error } = await client.auth.getUser();
    const marker = (await cookies()).get("ja-recovery")?.value;
    if (error || !data.user || marker !== data.user.id) return { message: "Solicite um novo link de recuperação para alterar a senha." };
    const result = await client.auth.updateUser({ password });
    if (result.error) return unavailable;
    const signedOut = await client.auth.signOut();
    if (signedOut.error) return { message: "Senha atualizada, mas não foi possível encerrar a sessão. Use Sair da conta antes de entrar novamente." };
    (await cookies()).delete("ja-recovery");
  } catch { return unavailable; }
  redirect("/login?status=password-updated");
}

export async function logout(previous: AuthState): Promise<AuthState> {
  void previous;
  try {
    const client = await authClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return unavailable;
    (await cookies()).delete("ja-recovery");
  } catch { return unavailable; }
  redirect("/login");
}
