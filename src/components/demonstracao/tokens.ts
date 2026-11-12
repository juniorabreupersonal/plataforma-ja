import type { CSSProperties } from "react";

// Fonte única da paleta aprovada. O escopo visual permanece na demonstração.
export const brandPalette = [
  { token: "--ja-blue", name: "Azul Performance", value: "#0B5ED7", use: "Cor principal: navegação ativa, ações e indicadores." },
  { token: "--ja-purple", name: "Roxo Equilibrado", value: "#7B61C9", use: "Complemento discreto: estados, detalhes e transições." },
  { token: "--ja-graphite", name: "Grafite", value: "#1E1E1E", use: "Superfícies de cartões e seções." },
  { token: "--ja-black", name: "Preto", value: "#080808", use: "Fundo principal." },
  { token: "--ja-metal", name: "Cinza Metálico", value: "#E5E7EB", use: "Textos secundários e detalhes neutros." },
  { token: "--ja-white", name: "Branco", value: "#FFFFFF", use: "Texto principal e contraste das ações." },
] as const;

export const brandStyle = Object.fromEntries(
  brandPalette.map(({ token, value }) => [token, value]),
) as CSSProperties;

// Classes prefixadas: o loader CSS atual do projeto não exporta CSS Modules.
export const demoClasses = {
  theme: "ja-demo",
  focus: "ja-demo__focus",
  border: "ja-demo__border",
  muted: "ja-demo__muted",
  secondary: "ja-demo__secondary",
  surface: "ja-demo__surface",
  skip: "ja-demo__skip",
  active: "ja-demo__active",
  primary: "ja-demo__primary",
  navLink: "ja-demo__navLink",
  link: "ja-demo__link",
  notice: "ja-demo__notice",
  hero: "ja-demo__hero",
  badge: "ja-demo__badge",
  metric: "ja-demo__metric",
  exampleCard: "ja-demo__exampleCard",
  step: "ja-demo__step",
  wordmark: "ja-demo__wordmark",
} as const;
