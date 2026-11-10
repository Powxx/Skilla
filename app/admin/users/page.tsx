import { Suspense } from "react";
import UsersDataFetcher from "./users-data-fetcher";
import UsersShellSkeleton from "./users-shell-skeleton";
import { requirePagePermission } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Utilisateurs — Administration",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  await requirePagePermission("canManageUsers");

  return (
    <Suspense fallback={<UsersShellSkeleton />}>
      <UsersDataFetcher searchParamsPromise={searchParams} />
    </Suspense>
  );
}
