import { Suspense } from "react";
import SanctionsDataFetcher from "./sanctions-data-fetcher";
import SanctionsShellSkeleton from "./sanctions-shell-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestion des Sanctions — Administration",
};

export default function AdminSanctionsPage() {
  return (
    <Suspense fallback={<SanctionsShellSkeleton />}>
      <SanctionsDataFetcher />
    </Suspense>
  );
}
