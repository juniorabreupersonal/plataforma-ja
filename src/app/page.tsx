
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold tracking-[0.2em] text-amber-400">
            JÚNIOR ABREU
          </p>
          <h1 className="text-2xl font-bold tracking-wide">
            PERFORMANCE
          </h1>
          <p className="mt-2 text-xs tracking-widest text-slate-400">
            AVALIAÇÃO • TREINAMENTO • EVOLUÇÃO
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-400">
            MÉTODO JA
          </span>

          <h2 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
            Seu treino começa
            <span className="block text-amber-400">
              antes do exercício.
            </span>
          </h2>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-300">
            Uma metodologia de treinamento personalizado
            que integra avaliação, interpretação profissional,
            planejamento e acompanhamento da evolução.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#servicos"
              className="rounded-lg bg-amber-400 px-6 py-4 font-semibold text-slate-950"
            >
              Conhecer os serviços
            </Link>

            <Link
              href="/login"
              className="rounded-lg border border-white/30 px-6 py-4 font-semibold"
            >
              Acessar plataforma
            </Link>
          </div>
        </div>
      </section>

      <section
        id="servicos"
        className="border-t border-white/10 bg-slate-900 px-6 py-16"
      >
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-8 text-3xl font-bold">
            Nossos serviços
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                nome: "Avaliação JA",
                descricao:
                  "Avaliação postural e funcional individualizada.",
              },
              {
                nome: "JA Personal Online",
                descricao:
                  "Treinamento personalizado e acompanhamento.",
              },
              {
                nome: "JA 90 Dias",
                descricao:
                  "Programa de treinamento com evolução acompanhada.",
              },
            ].map((servico) => (
              <div
                key={servico.nome}
                className="rounded-xl border border-white/10 bg-slate-800 p-6"
              >
                <h4 className="text-xl font-bold text-amber-400">
                  {servico.nome}
                </h4>
                <p className="mt-4 text-slate-300">
                  {servico.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="acessos"
        className="mx-auto max-w-6xl px-6 py-16"
      >
        <h3 className="text-3xl font-bold">
          Área de acesso
        </h3>

        <p className="mt-4 text-slate-300">
          Em breve, você poderá acessar seu ambiente
          individual de treinamento e avaliação.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 p-6">
            <h4 className="text-xl font-bold">
              Área do Aluno
            </h4>
            <p className="mt-3 text-slate-400">
              Avaliações, treinamentos e resultados.
            </p>
            <span className="mt-6 inline-block text-amber-400">
              Em desenvolvimento
            </span>
          </div>

          <div className="rounded-xl border border-white/10 p-6">
            <h4 className="text-xl font-bold">
              Área Profissional
            </h4>
            <p className="mt-3 text-slate-400">
              Gestão de alunos, avaliações e prescrições.
            </p>
            <span className="mt-6 inline-block text-amber-400">
              Em desenvolvimento
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-400">
        JÚNIOR ABREU PERFORMANCE
        <p className="mt-2">
          AVALIAÇÃO • TREINAMENTO • EVOLUÇÃO
        </p>
      </footer>
    </main>
  );
}
