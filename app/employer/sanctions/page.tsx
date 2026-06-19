import { Suspense } from "react";
import EmployerSanctionsDataFetcher from "./sanctions-data-fetcher";
import SanctionsPortalSkeleton from "@/components/sanctions/sanctions-portal-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assiduité et Discipline — Espace Entreprise",
};

export default function EmployerSanctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<SanctionsPortalSkeleton />}>
      <EmployerSanctionsDataFetcher searchParamsPromise={searchParams} />
    </Suspense>
  );
}
