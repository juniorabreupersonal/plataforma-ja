import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return <AuthShell title="Criar sua conta"><p className="mt-6">Confirme seu e-mail antes de acessar. Abra o link no mesmo navegador em que iniciou o cadastro. O cadastro não concede funções profissionais ou administrativas.</p><AuthForm mode="signup" /></AuthShell>;
}
