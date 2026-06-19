import { Suspense } from "react";
import ProfSanctionsDataFetcher from "./sanctions-data-fetcher";
import ProfSanctionsShellSkeleton from "./sanctions-shell-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sanctions — Espace Enseignant",
};

export default function ProfSanctionsPage() {
  return (
    <Suspense fallback={<ProfSanctionsShellSkeleton />}>
      <ProfSanctionsDataFetcher />
    </Suspense>
  );
}
