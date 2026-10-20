
"use client";

import { useState } from "react";

import { createSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <main
      style={{
        maxWidth: "420px",
        margin: "60px auto",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h1>JÚNIOR ABREU PERFORMANCE</h1>

      <h2>Acesso à Plataforma JA</h2>

      <p>AVALIAÇÃO • TREINAMENTO • EVOLUÇÃO</p>

      <form
        onSubmit={(evento) => evento.preventDefault()}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginTop: "30px",
          textAlign: "left",
        }}
      >
        <label htmlFor="email">E-mail</label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          placeholder="Digite seu e-mail"
          required
          style={{ padding: "12px", color: "#111" }}
        />

        <label htmlFor="senha">Senha</label>

        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          placeholder="Digite sua senha"
          required
          style={{ padding: "12px", color: "#111" }}
        />

        <button
          type="submit"
          style={{
            padding: "12px",
            backgroundColor: "#222",
            color: "white",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>

      <p style={{ marginTop: "24px", fontSize: "14px" }}>
        Autenticação em desenvolvimento.
      </p>
    </main>
  );
}

