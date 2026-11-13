import Link from "next/link";
import type { ReactNode } from "react";
import { brandStyle, demoClasses as styles } from "./tokens";
import "./theme.css";
import { profiles, type DemoDashboard } from "./data";

const focus = styles.focus;

export function DemoFrame({ children, contentId = "conteudo-demonstracao" }: { children: ReactNode; contentId?: string }) {
  return (
    <div className={`min-h-screen ${styles.theme}`} style={brandStyle}>
      <a href={`#${contentId}`} className={`sr-only z-50 rounded-lg p-3 ${styles.skip} focus:not-sr-only focus:fixed focus:left-4 focus:top-4 ${focus}`}>Pular para o conteúdo</a>
      <header className={`border-b ${styles.border}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-6 sm:px-8">
          <Link href="/demonstracao" className={`flex items-center gap-3 rounded-lg ${focus}`} aria-label="JÚNIOR ABREU PERFORMANCE — início da demonstração">
            <span className={styles.wordmark}><span className="block text-sm font-bold tracking-[0.12em]">JÚNIOR ABREU</span><span className={`block text-xs tracking-[0.22em] ${styles.muted}`}>PERFORMANCE</span></span>
          </Link>
          <Link href="/" className={`rounded-lg text-sm underline underline-offset-4 ${styles.link} ${focus}`}>Página inicial</Link>
        </div>
      </header>
      <div role="note" aria-label="Aviso de demonstração" className={`border-b ${styles.notice}`}>
        <div className="mx-auto max-w-7xl px-5 py-4 text-sm leading-6 sm:px-8">
          <strong>Demonstração — dados fictícios.</strong>{" "}
          Nenhuma operação é executada. Escolher um painel não altera sua conta nem concede acesso a alunos.
        </div>
      </div>
      {children}
      <footer className={`mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t px-5 py-7 text-xs leading-6 sm:px-8 ${styles.border} ${styles.muted}`}>
        <span>JÚNIOR ABREU PERFORMANCE</span><span>Avaliação · Treinamento · Evolução</span><Link href="/demonstracao/identidade" className={`underline underline-offset-4 ${styles.link} ${focus}`}>Revisar identidade visual</Link>
      </footer>
    </div>
  );
}

export function DemoArrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block h-4 w-4 shrink-0 align-middle"><path d="M7 17 17 7M7 7h10v10" /></svg>;
}

export function DemoBadge({ children }: { children: ReactNode }) {
  return <span className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium ${styles.badge}`}>{children}</span>;
}

export function MetricCard({ label, value, detail }: DemoDashboard["metrics"][number]) {
  return <div className={`rounded-2xl border p-5 sm:p-6 ${styles.metric}`}><dt className={`text-sm ${styles.secondary}`}>{label}</dt><dd className="mt-3 text-4xl font-semibold tracking-tight">{value}</dd><dd className={`mt-2 text-xs leading-5 ${styles.muted}`}>{detail}</dd></div>;
}

export function Dashboard({ dashboard }: { dashboard: DemoDashboard }) {
  const current = profiles.find((profile) => profile.id === dashboard.profile)!;
  return (
    <DemoFrame contentId={`conteudo-${dashboard.profile}`}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-10">
        <aside className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest ${styles.muted}`}>Painéis de demonstração</p>
          <nav aria-label="Escolher painel de demonstração" className="mt-4 flex flex-wrap gap-2 lg:flex-col">
            {profiles.map((profile) => <Link key={profile.id} href={`/demonstracao/${profile.id}`} aria-current={profile.id === dashboard.profile ? "page" : undefined} className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${profile.id === dashboard.profile ? styles.active : `border-transparent ${styles.navLink}`} ${focus}`}>{profile.title}</Link>)}
          </nav>
          <nav aria-label={`Navegação do painel ${current.title}`} className={`mt-6 border-t pt-4 ${styles.border}`}>
            <ul className="flex flex-wrap gap-2 lg:flex-col">
              <li><a href={`#${dashboard.profile}-visao-geral`} className={`block rounded-lg px-3 py-2 text-sm ${styles.navLink} ${focus}`}>Visão geral</a></li>
              {dashboard.sections.map((section) => <li key={section.id}><a href={`#${dashboard.profile}-${section.id}`} className={`block rounded-lg px-3 py-2 text-sm ${styles.navLink} ${focus}`}>{section.title}</a></li>)}
            </ul>
          </nav>
          <p className={`mt-6 hidden rounded-xl border p-4 text-xs leading-6 lg:block ${styles.border} ${styles.muted}`}>Uma prévia visual da Plataforma JA. Todos os nomes, números e estados são fictícios.</p>
        </aside>
        <main id={`conteudo-${dashboard.profile}`} className="min-w-0">
          <section id={`${dashboard.profile}-visao-geral`} aria-labelledby={`titulo-${dashboard.profile}`} className={`scroll-mt-6 rounded-2xl border p-6 sm:p-8 ${styles.hero}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${styles.secondary}`}>Painel de demonstração · {current.title}</p>
            <h1 id={`titulo-${dashboard.profile}`} className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{dashboard.title}</h1>
            <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${styles.secondary}`}>{dashboard.description}</p>
            <a href={`#${dashboard.profile}-${dashboard.sections[1].id}`} className={`mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl px-5 py-3 text-sm font-bold ${styles.primary} ${focus}`}>{dashboard.highlight}<DemoArrow /></a>
          </section>
          <dl aria-label="Indicadores fictícios" className="mt-6 grid gap-4 sm:grid-cols-3">{dashboard.metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</dl>
          <div className="mt-8 space-y-6">
            {dashboard.sections.map((section) => <section key={section.id} id={`${dashboard.profile}-${section.id}`} aria-labelledby={`titulo-${dashboard.profile}-${section.id}`} className={`scroll-mt-6 rounded-2xl border p-5 sm:p-6 ${styles.surface}`}>
              <h2 id={`titulo-${dashboard.profile}-${section.id}`} className="text-xl font-semibold tracking-tight">{section.title}</h2>
              <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{section.description}</p>
              <ul className="mt-5">{section.items.map((item) => <li key={item.title} className={`flex flex-col items-start gap-3 border-t py-5 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-5 ${styles.border}`}><div className="min-w-0"><h3 className="font-medium">{item.title}</h3><p className={`mt-1 text-sm leading-6 ${styles.muted}`}>{item.description}</p></div><DemoBadge>{item.status}</DemoBadge></li>)}</ul>
            </section>)}
          </div>
          <Link href="/demonstracao" className={`mt-8 inline-block rounded-lg py-3 text-sm underline underline-offset-4 ${styles.link} ${focus}`}>Voltar à apresentação dos painéis</Link>
        </main>
      </div>
    </DemoFrame>
  );
}
