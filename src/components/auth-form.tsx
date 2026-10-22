"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, recover, resetPassword, type AuthState } from "@/app/auth/actions";

const actions = { login, signup, recover, reset: resetPassword };
const labels = { login: "Entrar", signup: "Criar conta", recover: "Enviar instruções", reset: "Salvar nova senha" };
export function AuthForm({ mode }: { mode: keyof typeof actions }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(actions[mode], { message: "" });
  const newPassword = mode === "signup" || mode === "reset";
  const field = "w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white";
  return <form action={action} className="mt-8 space-y-5">
    {mode !== "reset" && <div><label htmlFor="email">E-mail</label><input className={field} id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>}
    {mode !== "recover" && <div><label htmlFor="password">{mode === "reset" ? "Nova senha" : "Senha"}</label><input className={field} id="password" name="password" type="password" autoComplete={newPassword ? "new-password" : "current-password"} minLength={newPassword ? 12 : 1} maxLength={128} required /></div>}
    {newPassword && <><p className="text-sm text-slate-300">Use entre 12 e 128 caracteres.</p><div><label htmlFor="confirmation">Confirme a senha</label><input className={field} id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div></>}
    <p role="status" aria-live="polite" className="text-amber-300">{state.message}</p>
    <button disabled={pending} className="w-full rounded-lg bg-amber-400 p-4 font-bold text-slate-950 disabled:opacity-50">{pending ? "Aguarde…" : labels[mode]}</button>
    <nav className="flex flex-wrap gap-4 text-sm text-amber-300" aria-label="Acesso à conta"><Link href="/login">Entrar</Link><Link href="/criar-conta">Criar conta</Link><Link href="/recuperar-senha">Esqueci minha senha</Link></nav>
  </form>;
}
