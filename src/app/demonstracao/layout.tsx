import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Demonstração | Plataforma JA", template: "%s | Demonstração JA" },
  description: "Prévia visual dos painéis da JÚNIOR ABREU PERFORMANCE, exclusivamente com dados fictícios.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
