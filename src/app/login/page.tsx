import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
async function Notice({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const message = status === "password-updated" ? "Senha atualizada. Entre novamente." : status === "invalid-link" ? "Link inválido ou expirado. Solicite um novo link. Abra-o no mesmo navegador em que iniciou a solicitação." : "";
  return <p role="status" className="mt-4 text-amber-300">{message}</p>;
}
export default function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <AuthShell title="Acesso à Plataforma JA"><Suspense><Notice searchParams={searchParams} /></Suspense><AuthForm mode="login" /></AuthShell>;
}
