import Link from "next/link";
import { DemoArrow, DemoFrame } from "@/components/demonstracao/dashboard";
import { profiles } from "@/components/demonstracao/data";

export default function Demonstracao() {
  return (
    <DemoFrame>
      <main id="conteudo-demonstracao" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Conheça a Plataforma JA</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Três perspectivas.<br /><span className="text-slate-400">Uma jornada de evolução.</span></h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">Explore a base visual dos painéis de administrador, profissional e aluno. Esta prévia usa somente personagens e situações fictícias; os recursos de atendimento ainda não estão disponíveis.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {profiles.map((profile) => <Link key={profile.id} href={`/demonstracao/${profile.id}`} className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900 p-6 transition-colors hover:border-amber-300/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:p-8"><span aria-hidden="true" className="text-sm font-medium text-amber-300">{profile.marker} /</span><h2 className="mt-8 text-2xl font-semibold">{profile.title}</h2><p className="mt-3 flex-1 text-sm leading-7 text-slate-400">{profile.description}</p><span className="mt-8 text-sm font-semibold text-amber-300">Ver demonstração <DemoArrow /></span></Link>)}
        </div>
        <p className="mt-10 max-w-2xl text-sm leading-7 text-slate-400">A escolha de um painel serve apenas para explorar esta demonstração. Não cria vínculos, não atribui funções e não disponibiliza informações de alunos.</p>
      </main>
    </DemoFrame>
  );
}
