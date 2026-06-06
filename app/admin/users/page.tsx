import { Suspense } from "react";
import UsersDataFetcher from "./users-data-fetcher";
import UsersShellSkeleton from "./users-shell-skeleton";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Utilisateurs — Administration",
};

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  return (
    <Suspense fallback={<UsersShellSkeleton />}>
      <UsersDataFetcher searchParamsPromise={searchParams} />
    </Suspense>
  );
}
