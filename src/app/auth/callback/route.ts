import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authClient } from "@/lib/auth/server";
import { applicationOrigin } from "@/lib/auth/validation";

export async function GET(request: NextRequest) {
  let origin: string;
  try { origin = applicationOrigin(process.env.APP_URL); }
  catch { return new NextResponse("Autenticação indisponível. Contate o suporte.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  let destination = "/login?status=invalid-link";
  const code = request.nextUrl.searchParams.get("code");
  if (code && code.length <= 4096) {
    try {
      const client = await authClient();
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at) {
        const recovery = request.nextUrl.searchParams.get("flow") === "recovery";
        if (recovery) (await cookies()).set("ja-recovery", data.user.id, {
          httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
        });
        destination = recovery ? "/redefinir-senha" : "/conta";
      }
    } catch { /* Não expor códigos, tokens ou respostas do provedor. */ }
  }
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
