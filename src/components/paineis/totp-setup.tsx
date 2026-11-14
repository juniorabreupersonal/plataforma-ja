"use client";
import { useActionState } from "react";
import { setupTotp } from "@/app/conta/seguranca/actions";
import { demoClasses as styles } from "@/components/demonstracao/tokens";
export function TotpSetup() {
  const [state, action, pending] = useActionState(setupTotp, { message: "", factorId: "", secret: "", complete: false });
  return <div className="space-y-4"><p role="status">{state.message}</p>
    {state.secret && <label className="block">Chave de configuração TOTP<input value={state.secret} readOnly autoComplete="off" spellCheck={false} className={`mt-2 w-full rounded-lg border bg-transparent p-3 ${styles.border}`} /><span className="mt-2 block text-sm">Cadastre esta chave manualmente em seu autenticador. Não envie por mensagem nem inclua em capturas, logs ou tickets.</span></label>}
    {!state.complete && <form action={action} className="space-y-4"><input type="hidden" name="intent" value={state.factorId ? "verify" : "start"} />
      {state.factorId && <><input type="hidden" name="factorId" value={state.factorId} /><label className="block">Código do autenticador<input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} className={`mt-2 w-full rounded-lg border bg-transparent p-3 ${styles.border} ${styles.focus}`} /></label></>}
      <button disabled={pending} className={`min-h-11 rounded-xl px-5 py-3 ${styles.primary} ${styles.focus}`}>{pending ? "Aguarde…" : state.factorId ? "Confirmar autenticador" : "Iniciar configuração TOTP"}</button>
    </form>}
  </div>;
}
