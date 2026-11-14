"use client";
import { useActionState } from "react";
import { createOrganization } from "@/app/conta/panel-actions";
import { demoClasses as styles } from "@/components/demonstracao/tokens";
export function CreateOrganization() {
  const [state, action, pending] = useActionState(createOrganization, { message: "" });
  return <form action={action} className="mt-6 space-y-3"><label className="block">Nome da organização<input name="name" required maxLength={160} className={`mt-2 block w-full rounded-lg border bg-transparent p-3 ${styles.border} ${styles.focus}`} /></label><button disabled={pending} className={`min-h-11 rounded-xl px-5 py-3 ${styles.primary} ${styles.focus}`}>{pending ? "Criando…" : "Criar organização"}</button><p role="status">{state.message}</p></form>;
}
