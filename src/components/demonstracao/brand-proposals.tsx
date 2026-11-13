import Image from "next/image";
import copies from "./technical-copies.json";
import { demoClasses as styles } from "./tokens";

const proposals = [
  { variant: "horizontal", title: "Logotipo horizontal", width: 1448, height: 1086 },
  { variant: "vertical", title: "Logotipo vertical", width: 1122, height: 1402 },
  { variant: "simbolo", title: "Símbolo JA", width: 1254, height: 1254 },
] as const;

type Asset = { path: string; width: number; height: number };
function LogoImage({ asset, alt, width }: { asset: Asset; alt: string; width?: number }) {
  return <Image unoptimized src={asset.path} width={asset.width} height={asset.height} alt={alt} className="h-auto max-w-full" style={{ width: width ?? "100%" }} />;
}

function Comparison({ original, revised, title, light = false }: { original: Asset; revised: Asset; title: string; light?: boolean }) {
  return <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">
    {[{ asset: original, label: "Original preservado" }, { asset: revised, label: "Cópia técnica — para comparação" }].map(({ asset, label }) => <figure key={label} className="min-w-0">
      <figcaption className={`mb-2 text-sm ${styles.secondary}`}>{label} · {asset.width} × {asset.height} px</figcaption>
      <div className={`rounded-lg border ${styles.border}`} style={{ backgroundColor: light ? "var(--ja-white)" : "var(--ja-black)" }}>
        <LogoImage asset={asset} alt={`${title} — ${label.toLowerCase()} sobre fundo ${light ? "claro" : "escuro"}`} />
      </div>
      <a href={asset.path} className={`mt-2 inline-block rounded-lg py-2 text-sm underline underline-offset-4 ${styles.link} ${styles.focus}`}>Abrir PNG — {title} — {label.toLowerCase()}</a>
    </figure>)}
  </div>;
}

export function BrandProposals() {
  return (
    <section aria-labelledby="marca-identidade" className={`rounded-2xl border p-6 ${styles.surface}`}>
      <h2 id="marca-identidade" className="text-xl font-semibold">Logotipos — comparação técnica antes e depois</h2>
      <p className={`mt-3 max-w-3xl text-sm leading-7 ${styles.secondary}`}>Os originais continuam intactos. As cópias ajustam somente margens e resíduos isolados de transparência mínima, sem redesenhar, recolorir, esticar ou alterar o lettering. As sombras e os demais detalhes foram preservados.</p>
      <p className={`mt-3 max-w-3xl text-sm leading-7 ${styles.muted}`}>Uso exclusivo para revisão. Nenhuma cópia foi ativada nos painéis, menus ou telas de acesso. Halos junto à marca, serrilhado e diferenças de acabamento frente à prancha permanecem: não foram corrigidos automaticamente.</p>
      <div className="mt-6 space-y-8">
        {proposals.map((logo) => {
          const revised = copies.variants.find((entry) => entry.variant === logo.variant)!;
          const original = { path: `/brand/propostas/ja-${logo.variant}.png`, width: logo.width, height: logo.height };
          return <article key={logo.variant} className={`min-w-0 rounded-xl border p-4 ${styles.border}`}>
            <h3 className="font-semibold">{logo.title}</h3>
            <p className={`mt-2 text-xs leading-6 ${styles.muted}`}>Margem técnica proposta: {revised.safeAreaPx} px em cada lado, sem reamostragem. Aprovação visual ainda pendente.</p>
            <Comparison original={original} revised={revised} title={logo.title} />
            <details className="mt-3">
              <summary className={`cursor-pointer rounded-lg py-2 text-sm underline underline-offset-4 ${styles.link} ${styles.focus}`}>Comparar sobre fundo claro — {logo.title}</summary>
              <Comparison original={original} revised={revised} title={logo.title} light />
            </details>
          </article>;
        })}
      </div>
      <section aria-labelledby="tamanhos-marca" className="mt-10">
        <h3 id="tamanhos-marca" className="text-xl font-semibold">Prévias em tamanhos de interface</h3>
        <p className={`mt-3 text-sm leading-7 ${styles.secondary}`}>Encaixes de comparação, sem trocar a marca do cabeçalho desta página. As dimensões indicam pixels CSS; em telas estreitas, a apresentação se reduz proporcionalmente.</p>
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          {copies.variants.filter((entry) => entry.variant !== "simbolo").map((asset) => <figure key={asset.variant} className={`min-w-0 rounded-xl border p-4 ${styles.border}`}>
            <figcaption className={`mb-3 text-sm ${styles.secondary}`}>{asset.variant === "horizontal" ? "Ensaio de cabeçalho · até 320 px de largura" : "Ensaio de apresentação · até 240 px de largura"}</figcaption>
            <LogoImage asset={asset} alt={`Cópia técnica ${asset.variant} em tamanho de interface, não ativada`} width={asset.variant === "horizontal" ? 320 : 240} />
          </figure>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-5">
          {[32, 48, 64].map((size) => <figure key={size} className={`rounded-xl border p-4 ${styles.border}`}>
            <figcaption className={`mb-3 text-xs ${styles.secondary}`}>Menu · caixa {size} × {size} px</figcaption>
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
              <LogoImage asset={copies.variants.find((entry) => entry.variant === "simbolo")!} alt={`Símbolo JA revisado na caixa de menu de ${size} pixels, sem deformação`} width={size} />
            </div>
          </figure>)}
        </div>
        <p className={`mt-4 text-sm leading-7 ${styles.muted}`}>O símbolo é largo e detalhado; a leitura em 32 px continua limitada. Torná-lo um ícone simplificado ou mudar o lettering exigiria uma nova decisão de desenho da marca.</p>
      </section>
    </section>
  );
}
