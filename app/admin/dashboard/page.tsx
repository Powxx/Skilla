import { Suspense } from "react";
import DashboardDataFetcher from "./dashboard-data-fetcher";
import DashboardShellSkeleton from "./dashboard-shell-skeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tour de Contrôle — Administration",
};

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <DashboardDataFetcher searchParamsPromise={searchParams} />
    </Suspense>
  );
}
