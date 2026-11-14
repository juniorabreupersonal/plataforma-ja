import Image from "next/image";
import copies from "./technical-copies.json";

/** Existing technical PNGs, delivered without image transformation. */
export function DemoBrand({ variant, width, className = "" }: {
  variant: "horizontal" | "vertical" | "simbolo";
  width: number;
  className?: string;
}) {
  const asset = copies.variants.find((entry) => entry.variant === variant)!;
  return <Image unoptimized src={asset.path} width={asset.width} height={asset.height}
    alt={variant === "simbolo" ? "Símbolo JA — JÚNIOR ABREU PERFORMANCE" : "JÚNIOR ABREU PERFORMANCE — Avaliação, Treinamento e Acompanhamento"}
    className={`h-auto max-w-full ${className}`} style={{ width }} />;
}
