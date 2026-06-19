import { Suspense } from "react";
import ParentSanctionsDataFetcher from "./sanctions-data-fetcher";
import SanctionsPortalSkeleton from "@/components/sanctions/sanctions-portal-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sanctions de l'élève — Espace Famille",
};

export default function ParentSanctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<SanctionsPortalSkeleton />}>
      <ParentSanctionsDataFetcher searchParamsPromise={searchParams} />
    </Suspense>
  );
}
