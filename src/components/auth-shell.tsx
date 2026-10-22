import type { ReactNode } from "react";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-white"><div className="mx-auto max-w-md">
    <p className="text-sm font-bold tracking-widest text-amber-400">JÚNIOR ABREU PERFORMANCE</p>
    <h1 className="mt-6 text-3xl font-bold">{title}</h1>
    <p className="mt-3 text-sm text-slate-400">AVALIAÇÃO • TREINAMENTO • EVOLUÇÃO</p>
    {children}
  </div></main>;
}
