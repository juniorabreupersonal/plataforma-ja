import Link from "next/link";
import type { ReactNode } from "react";
import type { PanelContext } from "@/lib/panels/server";
import { DemoBrand } from "@/components/demonstracao/brand";
import { brandStyle, demoClasses as styles } from "@/components/demonstracao/tokens";
import { LogoutButton } from "@/components/logout-button";
import "@/components/demonstracao/theme.css";

export function PanelNavigation({ permissions }: { permissions: PanelContext }) {
  return <nav aria-label="Seus painéis" className="flex flex-wrap gap-3">
    {permissions.professional && <Link className={`rounded-lg p-3 underline ${styles.focus}`} href="/profissional">Profissional</Link>}
    {permissions.student && <Link className={`rounded-lg p-3 underline ${styles.focus}`} href="/aluno">Aluno</Link>}
    {permissions.administrator && <Link className={`rounded-lg p-3 underline ${styles.focus}`} href="/administrador">Administrador</Link>}
  </nav>;
}
export function PanelShell({ title, permissions, children }: { title: string; permissions: PanelContext; children: ReactNode }) {
  return <div className={`min-h-screen ${styles.theme}`} style={brandStyle}>
    <a href="#conteudo-painel" className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 rounded-lg p-3 ${styles.skip} ${styles.focus}`}>Pular para o conteúdo</a>
    <header className={`border-b ${styles.border}`}><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-6 sm:px-8"><Link href="/conta" aria-label="JÚNIOR ABREU PERFORMANCE — minha conta" className={`rounded-lg ${styles.focus}`}><DemoBrand variant="horizontal" width={320} className="hidden sm:block" /><DemoBrand variant="simbolo" width={96} className="sm:hidden" /></Link><Link href="/conta" className={`p-3 underline ${styles.focus}`}>Minha conta</Link></div></header>
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]"><aside><PanelNavigation permissions={permissions} /><LogoutButton /></aside><main id="conteudo-painel" className="min-w-0"><section className={`rounded-2xl border p-6 sm:p-8 ${styles.hero}`}><h1 className="text-3xl font-semibold">{title}</h1><p className={`mt-4 text-sm leading-7 ${styles.secondary}`}>Homologação — utilizar exclusivamente contas e dados sintéticos. Este painel não disponibiliza informações de saúde.</p></section><div className="mt-6 space-y-6">{children}</div></main></div>
  </div>;
}
export function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className={`rounded-2xl border p-6 ${styles.surface}`}><h2 className="mb-4 text-xl font-semibold">{title}</h2>{children}</section>;
}
