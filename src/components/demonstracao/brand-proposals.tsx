import Image from "next/image";
import { demoClasses as styles } from "./tokens";

// Arquivos fornecidos pelo proprietário, mantidos byte a byte, sem otimização de imagem.
const proposals = [
  { variant: "horizontal", title: "Logotipo horizontal", width: 1448, height: 1086, use: "Proposta para cabeçalhos e navegação." },
  { variant: "vertical", title: "Logotipo vertical", width: 1122, height: 1402, use: "Proposta para telas de apresentação e acesso." },
  { variant: "simbolo", title: "Símbolo JA", width: 1254, height: 1254, use: "Proposta para menus compactos e identificação." },
] as const;

export function BrandProposals() {
  return (
    <section aria-labelledby="marca-identidade" className={`rounded-2xl border p-6 ${styles.surface}`}>
      <h2 id="marca-identidade" className="text-xl font-semibold">Logotipos recebidos — revisão técnica</h2>
      <p className={`mt-3 max-w-3xl text-sm leading-7 ${styles.secondary}`}>Os três PNGs têm transparência. Foram preservados sem recorte, limpeza, recoloração ou redesenho. Margens amplas, resíduos de baixa opacidade e diferenças visuais em relação à prancha precisam de aprovação antes de ativar a marca nos cabeçalhos e menus.</p>
      <p className={`mt-3 max-w-3xl text-sm leading-7 ${styles.muted}`}>A identificação textual dos painéis permanece nesta etapa. As amostras abaixo mantêm a tela inteira de cada arquivo; use o link para inspecionar o PNG em tamanho original.</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {proposals.map((logo) => <article key={logo.variant} className={`min-w-0 rounded-xl border p-4 ${styles.border}`}>
          <h3 className="font-semibold">{logo.title}</h3>
          <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{logo.use}</p>
          <div className={`mt-4 rounded-lg border ${styles.border}`} style={{ backgroundColor: "var(--ja-black)" }}>
            <Image unoptimized src={`/brand/propostas/ja-${logo.variant}.png`} width={logo.width} height={logo.height} alt={`Proposta de ${logo.title.toLowerCase()} da JÚNIOR ABREU PERFORMANCE, em revisão técnica`} className="h-auto w-full" />
          </div>
          <details className="mt-3">
            <summary className={`cursor-pointer rounded-lg py-2 text-sm underline underline-offset-4 ${styles.link} ${styles.focus}`}>Inspecionar sobre fundo claro</summary>
            <div className={`mt-2 rounded-lg border ${styles.border}`} style={{ backgroundColor: "var(--ja-white)" }}>
              <Image unoptimized src={`/brand/propostas/ja-${logo.variant}.png`} width={logo.width} height={logo.height} alt={`Mesma proposta de ${logo.title.toLowerCase()}, sem alterações, sobre fundo claro`} className="h-auto w-full" />
            </div>
          </details>
          <p className={`mt-3 text-xs leading-6 ${styles.muted}`}>{logo.width} × {logo.height} px · PNG RGBA · arquivo original</p>
          <a href={`/brand/propostas/ja-${logo.variant}.png`} className={`mt-2 inline-block rounded-lg py-2 text-sm underline underline-offset-4 ${styles.link} ${styles.focus}`}>Abrir PNG original — {logo.title}</a>
        </article>)}
      </div>
    </section>
  );
}
