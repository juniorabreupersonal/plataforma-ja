"use client";
import { useActionState } from "react";
import { logout } from "@/app/auth/actions";
export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { message: "" });
  return <form action={action} className="mt-8"><button disabled={pending} className="rounded-lg bg-amber-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-50">{pending ? "Saindo…" : "Sair da conta"}</button><p role="status">{state.message}</p></form>;
}
