import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return <AuthShell title="Recuperar senha"><p className="mt-6">Enviaremos um link para definir uma nova senha. Abra-o no mesmo navegador em que fez esta solicitação.</p><AuthForm mode="recover" /></AuthShell>;
}
