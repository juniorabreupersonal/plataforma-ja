import type { Metadata } from "next";
import { BrandProposals } from "@/components/demonstracao/brand-proposals";
import Link from "next/link";
import { DemoArrow, DemoBadge, DemoFrame, MetricCard } from "@/components/demonstracao/dashboard";
import { brandPalette, demoClasses as styles } from "@/components/demonstracao/tokens";

export const metadata: Metadata = { title: "Roxo Equilibrado — revisão visual" };

export default function Identidade() {
  return (
    <DemoFrame contentId="conteudo-identidade">
      <main id="conteudo-identidade" className="mx-auto max-w-7xl space-y-10 px-5 py-12 sm:px-8">
        <section className={`rounded-2xl border p-6 sm:p-8 ${styles.hero}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest ${styles.secondary}`}>Identidade visual · proposta para revisão</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Roxo Equilibrado</h1>
          <p className={`mt-4 max-w-3xl text-sm leading-7 ${styles.secondary}`}>Azul Performance como protagonista, roxo em pequenos detalhes e superfícies neutras. Estes exemplos são uma prévia para revisão dos painéis, sem operações ou dados reais.</p>
          <Link href="/demonstracao" className={`mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl px-5 py-3 text-sm font-bold ${styles.primary} ${styles.focus}`}>Explorar os três painéis <DemoArrow /></Link>
        </section>
        <section aria-labelledby="paleta-identidade">
          <h2 id="paleta-identidade" className="text-xl font-semibold">Paleta aprovada</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brandPalette.map((color) => <li key={color.token} className={`rounded-2xl border p-5 ${styles.surface}`}><div aria-hidden="true" className={`h-10 rounded-lg border ${styles.border}`} style={{ backgroundColor: `var(${color.token})` }} /><h3 className="mt-4 font-semibold">{color.name}</h3><p className={`mt-1 font-mono text-sm ${styles.secondary}`}>{color.value}</p><p className={`mt-3 text-sm leading-6 ${styles.muted}`}>{color.use}</p></li>)}
          </ul>
        </section>
        <section aria-labelledby="exemplos-identidade" className={`rounded-2xl border p-6 sm:p-8 ${styles.surface}`}>
          <h2 id="exemplos-identidade" className="text-xl font-semibold">Elementos de interface</h2>
          <p className={`mt-3 text-sm leading-7 ${styles.secondary}`}>Ação principal azul, foco visível por teclado e indicadores que combinam texto com um detalhe roxo, sem depender apenas da cor.</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link href="/demonstracao/profissional" className={`inline-flex min-h-11 items-center gap-3 rounded-xl px-5 py-3 text-sm font-bold ${styles.primary} ${styles.focus}`}>Ver painel profissional <DemoArrow /></Link>
            <Link href="/demonstracao/aluno" className={`rounded-lg py-3 text-sm underline underline-offset-4 ${styles.link} ${styles.focus}`}>Ver painel do aluno</Link>
            <DemoBadge>Revisão fictícia pendente</DemoBadge>
          </div>
          <dl aria-label="Indicador fictício de exemplo" className="mt-6 grid max-w-sm gap-4"><MetricCard label="Jornadas de exemplo" value="02" detail="Indicador ilustrativo, sem consulta a cadastros." /></dl>
        </section>
        <BrandProposals />
      </main>
    </DemoFrame>
  );
}
