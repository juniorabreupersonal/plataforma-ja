
"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function TesteSupabase() {
  const [resultado, setResultado] = useState(
    "Aguardando teste."
  );

  
async function testarConexao() {
  setResultado("Verificando comunicação com o Supabase...");

  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setResultado(
        "Erro: configurações do Supabase não encontradas."
      );
      return;
    }

    const resposta = await fetch(
      `${supabaseUrl}/auth/v1/health`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
        },
        cache: "no-store",
      }
    );

console.log("URL consultada:", resposta.url);
console.log("Código HTTP:", resposta.status);

const detalhes = await resposta.text();

console.log("Detalhes da resposta:", detalhes);

    if (resposta.ok) {
      setResultado(
        "SUCESSO: a Plataforma JA conseguiu se comunicar com o serviço de autenticação do Supabase."
      );
    } else {
      setResultado(
        `O Supabase respondeu com o código HTTP ${resposta.status}.`
      );
    }
  } catch (erro) {
    setResultado(
      erro instanceof Error
        ? `Falha na comunicação: ${erro.message}`
        : "Falha desconhecida na comunicação."
    );
  }
}


  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">
          Teste de conexão — Plataforma JA
        </h1>

        <p className="mt-4 text-slate-300">
          Verificação inicial da configuração do Supabase.
        </p>

        <button
          onClick={testarConexao}
          className="mt-6 rounded-lg bg-amber-400 px-6 py-3 font-bold text-slate-950"
        >
          Testar Supabase
        </button>

        <p role="status" className="mt-6">
          {resultado}
        </p>
      </div>
    </main>
  );
}
