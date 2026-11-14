import { serverEnvironment, stagingAccess } from "@/lib/environment/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let environment;
  try { environment = serverEnvironment(); }
  catch { return new NextResponse("Ambiente indisponível.", { status: 503, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } }); }
  const staging = environment.mode === "staging";
  if (staging) {
    if (request.nextUrl.origin !== environment.appOrigin) return new NextResponse("Origem indisponível.", { status: 421, headers: { "Cache-Control": "no-store" } });
    if (!stagingAccess(request.headers.get("authorization"), process.env.STAGING_GATE_SECRET)) return new NextResponse("Homologação restrita.", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="JA homologacao", charset="UTF-8"', "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  }
  let response = NextResponse.next({ request });
  if (staging) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  const path = request.nextUrl?.pathname ?? "/conta";
  const sessionRoute = /^\/(administrador|profissional|aluno|seguranca|conta|auth)(\/|$)/.test(path) || ["/login", "/criar-conta", "/recuperar-senha", "/redefinir-senha"].includes(path);
  if (!staging && !sessionRoute) return response;
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  const { url, key } = environment;
  if (!sessionRoute) return response;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        if (staging) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Referrer-Policy", "no-referrer");
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try { await supabase.auth.getUser(); } catch { /* As páginas e ações protegidas negam acesso em falhas. */ }
  return response;
}

export const config = { matcher: ["/:path*"] };
