"use client";
import { useActionState } from "react";
import { acceptInvitation } from "@/app/conta/panel-actions";
export function AcceptInvitation({ id }: { id: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, { message: "" });
  return <form action={action} className="mt-2"><input type="hidden" name="id" value={id} /><button disabled={pending} className="min-h-11 rounded-lg border border-white/30 px-4 py-2 focus-visible:outline-2 focus-visible:outline-white">{pending ? "Aceitando…" : "Aceitar convite"}</button><p role="status">{state.message}</p></form>;
}
