import type { Metadata } from "next";
import { Dashboard } from "@/components/demonstracao/dashboard";
import { dashboards } from "@/components/demonstracao/data";

export const metadata: Metadata = { title: "Profissional" };

export default function Page() {
  return <Dashboard dashboard={dashboards.profissional} />;
}
