import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth/server";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
async function Reset() {
  let allowed = false;
  try {
    const client = await authClient();
    const { data, error } = await client.auth.getUser();
    allowed = !error && Boolean(data.user) && (await cookies()).get("ja-recovery")?.value === data.user?.id;
  } catch { /* Negar acesso em falhas. */ }
  if (!allowed) redirect("/recuperar-senha");
  return <AuthForm mode="reset" />;
}
export default function Page() {
  return <AuthShell title="Definir nova senha"><Suspense fallback={<p>Verificando link…</p>}><Reset /></Suspense></AuthShell>;
}
