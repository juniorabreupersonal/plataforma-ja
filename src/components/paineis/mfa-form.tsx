"use client";
import { useActionState } from "react";
import { verifyMfa } from "@/app/seguranca/mfa/actions";
import { demoClasses as styles } from "@/components/demonstracao/tokens";
export function MfaForm() {
  const [state, action, pending] = useActionState(verifyMfa, { message: "" });
  return <form action={action} className="space-y-4"><label className="block">Código do autenticador<input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} className={`mt-2 block w-full rounded-lg border bg-transparent p-3 ${styles.border} ${styles.focus}`} /></label><button disabled={pending} className={`min-h-11 rounded-xl px-5 py-3 ${styles.primary} ${styles.focus}`}>{pending ? "Verificando…" : "Confirmar acesso"}</button><p role="status">{state.message}</p></form>;
}
