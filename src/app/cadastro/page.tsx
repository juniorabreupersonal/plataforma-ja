
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
const objetivos = [
  "Hipertrofia",
  "Força",
  "Condicionamento físico",
  "Redução de gordura corporal",
  "Mobilidade",
  "Melhora da qualidade de vida",
  "Outro",
];

export default function CadastroJA() {
    const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [objetivosSelecionados, setObjetivos] = useState<string[]>([]);
  const [prioridade, setPrioridade] = useState("");
  const [servico, setServico] = useState("");

  function alternarObjetivo(objetivo: string) {
    const atualizados = objetivosSelecionados.includes(objetivo)
      ? objetivosSelecionados.filter((item) => item !== objetivo)
      : [...objetivosSelecionados, objetivo];

    setObjetivos(atualizados);

    if (!atualizados.includes(prioridade)) {
      setPrioridade("");
    }
  }

  

function continuar(evento: React.FormEvent<HTMLFormElement>) {
  evento.preventDefault();

  if (objetivosSelecionados.length === 0 || !prioridade || !servico) {
    alert("Preencha seus objetivos, prioridade e serviço desejado.");
    return;
  }

  // Identificador temporário para testes da jornada.
  const jornadaId = crypto.randomUUID();

  router.push(`/triagem?jornada=${jornadaId}`);
}


  const campo =
    "w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-bold tracking-widest text-amber-400">
          JÚNIOR ABREU PERFORMANCE
        </p>

        <h1 className="mt-6 text-3xl font-bold">
          Cadastro Inicial JA
        </h1>

        <p className="mt-3 text-slate-300">
          Vamos conhecer seus objetivos para iniciar sua jornada.
        </p>

        <form
          onSubmit={continuar}
          className="mt-8 space-y-6 rounded-xl bg-slate-900 p-6"
        >
          <div>
            <label htmlFor="nome" className="mb-2 block">
              Nome completo
            </label>
            <input
              id="nome"
              className={campo}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className={campo}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="telefone" className="mb-2 block">
              Telefone
            </label>
            <input
              id="telefone"
              type="tel"
              className={campo}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          </div>

          <fieldset>
            <legend className="mb-3 font-semibold">
              Quais são seus objetivos?
            </legend>

            <div className="space-y-3">
              {objetivos.map((objetivo) => (
                <label
                  key={objetivo}
                  className="flex items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={objetivosSelecionados.includes(objetivo)}
                    onChange={() => alternarObjetivo(objetivo)}
                    className="h-5 w-5 accent-amber-400"
                  />
                  {objetivo}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="prioridade" className="mb-2 block">
              Qual é seu objetivo principal?
            </label>

            <select
              id="prioridade"
              className={campo}
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {objetivosSelecionados.map((objetivo) => (
                <option key={objetivo} value={objetivo}>
                  {objetivo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="servico" className="mb-2 block">
              Qual serviço deseja conhecer?
            </label>

            <select
              id="servico"
              className={campo}
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              <option value="avaliacao-ja">Avaliação JA</option>
              <option value="personal-online">JA Personal Online</option>
              <option value="ja-90-dias">JA 90 Dias</option>
              <option value="treinamento-online">
                Treinamento Online
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={objetivosSelecionados.length === 0}
            className="w-full rounded-lg bg-amber-400 p-4 font-bold text-slate-950 disabled:opacity-50"
          >
            Continuar
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          AVALIAÇÃO • TREINAMENTO • EVOLUÇÃO
        </p>
      </div>
    </main>
  );
}
