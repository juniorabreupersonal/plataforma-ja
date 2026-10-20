
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
type Resposta = "sim" | "nao" | "nao_sei";
type Categoria = "sintoma" | "contexto";

type Pergunta = {
  id: string;
  texto: string;
  categoria: Categoria;
};

const perguntas: Pergunta[] = [
  {
    id: "restricao",
    texto:
      "Algum profissional de saúde orientou você a evitar ou limitar exercícios atualmente?",
    categoria: "contexto",
  },
  {
    id: "peito",
    texto:
      "Você sente dor ou desconforto no peito durante esforços físicos?",
    categoria: "sintoma",
  },
  {
    id: "falta_ar",
    texto:
      "Você sente falta de ar fora do habitual ou desproporcional ao esforço?",
    categoria: "sintoma",
  },
  {
    id: "tontura",
    texto:
      "Você apresenta tonturas recorrentes, desmaios ou perda de consciência sem explicação?",
    categoria: "sintoma",
  },
  {
    id: "palpitacoes",
    texto:
      "Você percebe batimentos muito acelerados ou irregulares acompanhados de mal-estar?",
    categoria: "sintoma",
  },
  {
    id: "condicao",
    texto:
      "Você possui alguma condição de saúde diagnosticada?",
    categoria: "contexto",
  },
  {
    id: "medicamentos",
    texto:
      "Você utiliza algum medicamento regularmente?",
    categoria: "contexto",
  },
  {
    id: "cirurgia",
    texto:
      "Você passou por cirurgia ou procedimento e ainda está em recuperação?",
    categoria: "contexto",
  },
  {
    id: "gestacao",
    texto:
      "Você está gestante ou no período pós-parto?",
    categoria: "contexto",
  },
  {
    id: "dor",
    texto:
      "Você apresenta alguma dor, lesão ou dificuldade de movimento importante para informar?",
    categoria: "contexto",
  },
];

export default function TriagemJA() {
  return (
    <Suspense fallback={null}>
      <TriagemConteudo />
    </Suspense>
  );
}

function TriagemConteudo() {
const router = useRouter();
    const parametros = useSearchParams();
const jornadaId = parametros.get("jornada");
  const [respostas, setRespostas] = useState<
    Record<string, Resposta>
  >({});

  const [detalhes, setDetalhes] = useState<
    Record<string, string>
  >({});

  const [resultado, setResultado] = useState("");

  function responder(id: string, resposta: Resposta) {
    setRespostas((anterior) => ({
      ...anterior,
      [id]: resposta,
    }));

    setResultado("");
  }

  function analisar() {
    const incompletas = perguntas.filter(
      (pergunta) => !respostas[pergunta.id]
    );

    if (incompletas.length > 0) {
      setResultado(
        "Formulário incompleto. Responda todas as perguntas."
      );
      return;
    }

    const detalhesPendentes = perguntas.filter(
      (pergunta) =>
        respostas[pergunta.id] === "sim" &&
        !detalhes[pergunta.id]?.trim()
    );

    if (detalhesPendentes.length > 0) {
      setResultado(
        "Preencha os detalhes das respostas positivas."
      );
      return;
    }

    const sintomas = perguntas.filter(
      (pergunta) =>
        pergunta.categoria === "sintoma" &&
        respostas[pergunta.id] === "sim"
    );

    if (sintomas.length > 0) {
      setResultado(
        "AVALIAÇÃO COMPLEMENTAR: existem relatos de sintomas que exigem análise profissional e possível avaliação de saúde antes de atividades pertinentes."
      );
      return;
    }

    const pendencias = perguntas.filter(
      (pergunta) =>
        respostas[pergunta.id] === "nao_sei" ||
        (pergunta.categoria === "contexto" &&
          respostas[pergunta.id] === "sim")
    );

    if (pendencias.length > 0) {
      setResultado(
        "ANÁLISE PROFISSIONAL: algumas informações precisam ser esclarecidas antes de avançar."
      );
      return;
    }

    setResultado(
      "PODE PROSSEGUIR NO PROCESSO: nenhuma pendência foi identificada pelas regras preliminares. Isso não representa liberação médica ou autorização irrestrita para exercícios."
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold tracking-widest text-amber-400">
          JÚNIOR ABREU PERFORMANCE
        </p>

<button
  type="button"
  onClick={() => router.back()}
  className="mt-6 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
>
  ← Voltar ao cadastro
</button>

        <h1 className="mt-6 text-3xl font-bold">
          Triagem Inicial JA
        </h1>

{jornadaId && (
  <p className="mt-3 break-all text-sm text-slate-400">
    Jornada de demonstração: {jornadaId}
  </p>
)}

        <p className="mt-4 text-slate-300">
          Responda às perguntas com atenção. As informações
          serão utilizadas para orientar as próximas etapas
          do atendimento.
        </p>

        <div className="mt-8 space-y-6">
          {perguntas.map((pergunta, indice) => (
            <section
              key={pergunta.id}
              className="rounded-xl border border-slate-700 bg-slate-900 p-6"
            >
              <h2 className="font-semibold">
                {indice + 1}. {pergunta.texto}
              </h2>

              <div className="mt-4 flex flex-wrap gap-6">
                {(
                  [
                    ["sim", "Sim"],
                    ["nao", "Não"],
                    ["nao_sei", "Não sei"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label
                    key={valor}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="radio"
                      name={pergunta.id}
                      checked={
                        respostas[pergunta.id] === valor
                      }
                      onChange={() =>
                        responder(pergunta.id, valor)
                      }
                      className="accent-amber-400"
                    />
                    {rotulo}
                  </label>
                ))}
              </div>

              {respostas[pergunta.id] === "sim" && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm text-slate-300">
                    Conte um pouco mais sobre essa resposta:
                  </label>

                  <textarea
                    value={detalhes[pergunta.id] || ""}
                    onChange={(e) => {
                      setDetalhes((anterior) => ({
                        ...anterior,
                        [pergunta.id]: e.target.value,
                      }));
                      setResultado("");
                    }}
                    rows={3}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
                    placeholder="Descreva quando aconteceu, em quais situações e se recebeu alguma orientação."
                  />
                </div>
              )}
            </section>
          ))}

          <button
            onClick={analisar}
            className="w-full rounded-lg bg-amber-400 p-4 font-bold text-slate-950"
          >
            Conferir respostas
          </button>

          {resultado && (
            <div
              role="status"
              className="rounded-xl border border-amber-400/40 bg-slate-800 p-6"
            >
              <h2 className="mb-3 text-lg font-bold text-amber-400">
                Resultado preliminar
              </h2>

              <p>{resultado}</p>

              <p className="mt-4 text-sm text-slate-300">
                Esta é uma demonstração. As regras ainda
                precisam de validação técnica antes de
                utilização em atendimentos reais.
              </p>
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-sm text-slate-400">
          AVALIAÇÃO • TREINAMENTO • EVOLUÇÃO
        </p>
      </div>
    </main>
  );
}
