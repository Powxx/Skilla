import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { loadAdminDashboardPayload, type AdminDashboardPeriod } from "@/lib/admin-dashboard-data";
import AdminDashboardClient from "./dashboard-client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

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
      : "semester";

  try {
    const payload = await loadAdminDashboardPayload({ semesterId, classId, period });
    return <AdminDashboardClient payload={payload} />;
  } catch (error) {
    console.error("[DashboardDataFetcher] Erreur lors du chargement de la tour de contrôle:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-3xl border border-red-100 shadow-sm">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
          Impossible de charger la Tour de Contrôle
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Une erreur temporaire est survenue lors de l&apos;agrégation des indicateurs de l&apos;école.
        </p>
        <Link
          href="/admin/dashboard"
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition"
        >
          Recharger la page
        </Link>
      </div>
    );
  }
}
