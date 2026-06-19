import { Suspense } from "react";
import StudentSanctionsDataFetcher from "./sanctions-data-fetcher";
import SanctionsPortalSkeleton from "@/components/sanctions/sanctions-portal-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mes Sanctions — Espace Élève",
};

export default function StudentSanctionsPage() {
  return (
    <Suspense fallback={<SanctionsPortalSkeleton />}>
      <StudentSanctionsDataFetcher />
    </Suspense>
  );
}
