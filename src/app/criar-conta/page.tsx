import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return <AuthShell title="Criar sua conta"><p className="mt-6">Cadastre-se na Plataforma JA e comece sua jornada de avaliação, treinamento e evolução.</p><p className="mt-3">Após o cadastro, enviaremos um e-mail para confirmar sua conta.</p><AuthForm mode="signup" /></AuthShell>;
}
