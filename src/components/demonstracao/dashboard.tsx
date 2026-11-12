import Link from "next/link";
import type { ReactNode } from "react";
import { profiles, type DemoDashboard } from "./data";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300";

export function DemoFrame({ children, contentId = "conteudo-demonstracao" }: { children: ReactNode; contentId?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a href={`#${contentId}`} className={`sr-only z-50 rounded-lg bg-amber-300 p-3 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 ${focus}`}>Pular para o conteúdo</a>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-6 sm:px-8">
          <Link href="/demonstracao" className={`flex items-center gap-3 rounded-lg ${focus}`} aria-label="JÚNIOR ABREU PERFORMANCE — início da demonstração">
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-xl bg-amber-400 text-xl font-black tracking-tighter text-slate-950">JA</span>
            <span><span className="block text-sm font-bold tracking-[0.12em]">JÚNIOR ABREU</span><span className="block text-xs tracking-[0.22em] text-slate-400">PERFORMANCE</span></span>
          </Link>
          <Link href="/" className={`rounded-lg text-sm text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white ${focus}`}>Página inicial</Link>
        </div>
      </header>
      <div role="note" aria-label="Aviso de demonstração" className="border-b border-amber-300/20 bg-amber-300/5">
        <div className="mx-auto max-w-7xl px-5 py-4 text-sm leading-6 sm:px-8">
          <strong className="text-amber-300">Demonstração — dados fictícios.</strong>{" "}
          Nenhuma operação é executada. Escolher um painel não altera sua conta nem concede acesso a alunos.
        </div>
      </div>
      {children}
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 px-5 py-7 text-xs leading-6 text-slate-400 sm:px-8">
        <span>JÚNIOR ABREU PERFORMANCE</span><span>Avaliação · Treinamento · Evolução</span>
      </footer>
    </div>
  );
}

export function DemoArrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block h-4 w-4 shrink-0 align-middle"><path d="M7 17 17 7M7 7h10v10" /></svg>;
}

export function DemoBadge({ children }: { children: ReactNode }) {
  return <span className="inline-flex w-fit shrink-0 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">{children}</span>;
}

export function MetricCard({ label, value, detail }: DemoDashboard["metrics"][number]) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6"><dt className="text-sm text-slate-300">{label}</dt><dd className="mt-3 text-4xl font-semibold tracking-tight text-white">{value}</dd><dd className="mt-2 text-xs leading-5 text-slate-400">{detail}</dd></div>;
}

export function Dashboard({ dashboard }: { dashboard: DemoDashboard }) {
  const current = profiles.find((profile) => profile.id === dashboard.profile)!;
  return (
    <DemoFrame contentId={`conteudo-${dashboard.profile}`}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-10">
        <aside className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Painéis de demonstração</p>
          <nav aria-label="Escolher painel de demonstração" className="mt-4 flex flex-wrap gap-2 lg:flex-col">
            {profiles.map((profile) => <Link key={profile.id} href={`/demonstracao/${profile.id}`} aria-current={profile.id === dashboard.profile ? "page" : undefined} className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${profile.id === dashboard.profile ? "border-amber-300/30 bg-amber-300/10 text-amber-300" : "border-transparent text-slate-300 hover:bg-slate-900 hover:text-white"} ${focus}`}>{profile.title}</Link>)}
          </nav>
          <nav aria-label={`Navegação do painel ${current.title}`} className="mt-6 border-t border-white/10 pt-4">
            <ul className="flex flex-wrap gap-2 lg:flex-col">
              <li><a href={`#${dashboard.profile}-visao-geral`} className={`block rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-amber-300 ${focus}`}>Visão geral</a></li>
              {dashboard.sections.map((section) => <li key={section.id}><a href={`#${dashboard.profile}-${section.id}`} className={`block rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-amber-300 ${focus}`}>{section.title}</a></li>)}
            </ul>
          </nav>
          <p className="mt-6 hidden rounded-xl border border-white/10 p-4 text-xs leading-6 text-slate-400 lg:block">Uma prévia visual da Plataforma JA. Todos os nomes, números e estados são fictícios.</p>
        </aside>
        <main id={`conteudo-${dashboard.profile}`} className="min-w-0">
          <section id={`${dashboard.profile}-visao-geral`} aria-labelledby={`titulo-${dashboard.profile}`} className="scroll-mt-6 rounded-2xl border border-white/10 bg-linear-to-br from-slate-900 to-slate-950 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Painel de demonstração · {current.title}</p>
            <h1 id={`titulo-${dashboard.profile}`} className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{dashboard.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{dashboard.description}</p>
            <a href={`#${dashboard.profile}-${dashboard.sections[1].id}`} className={`mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 ${focus}`}>{dashboard.highlight}<DemoArrow /></a>
          </section>
          <dl aria-label="Indicadores fictícios" className="mt-6 grid gap-4 sm:grid-cols-3">{dashboard.metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</dl>
          <div className="mt-8 space-y-6">
            {dashboard.sections.map((section) => <section key={section.id} id={`${dashboard.profile}-${section.id}`} aria-labelledby={`titulo-${dashboard.profile}-${section.id}`} className="scroll-mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
              <h2 id={`titulo-${dashboard.profile}-${section.id}`} className="text-xl font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{section.description}</p>
              <ul className="mt-5 divide-y divide-white/10">{section.items.map((item) => <li key={item.title} className="flex flex-col items-start gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-5"><div className="min-w-0"><h3 className="font-medium text-slate-100">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p></div><DemoBadge>{item.status}</DemoBadge></li>)}</ul>
            </section>)}
          </div>
          <Link href="/demonstracao" className={`mt-8 inline-block rounded-lg py-3 text-sm text-slate-300 underline underline-offset-4 hover:text-amber-300 ${focus}`}>Voltar à apresentação dos painéis</Link>
        </main>
      </div>
    </DemoFrame>
  );
}
