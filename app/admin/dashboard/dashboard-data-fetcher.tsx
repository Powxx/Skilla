import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { loadAdminDashboardPayload, type AdminDashboardPeriod } from "@/lib/admin-dashboard-data";
import AdminDashboardClient from "./dashboard-client";

function getParam(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function DashboardDataFetcher({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const searchParams = await searchParamsPromise;
  const semesterId = getParam(searchParams.semester);
  const classId = getParam(searchParams.class);
  const periodRaw = getParam(searchParams.period);
  const period: AdminDashboardPeriod =
    periodRaw === "7d" || periodRaw === "30d" || periodRaw === "90d" || periodRaw === "semester"
      ? periodRaw
      : "30d";

  const payload = await loadAdminDashboardPayload({ semesterId, classId, period });

  return <AdminDashboardClient payload={payload} />;
}
