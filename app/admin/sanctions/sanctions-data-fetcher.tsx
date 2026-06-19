import prisma from "@/lib/prisma";
import Link from "next/link";
import { getSanctions, getSanctionTypes, isPointsSystemEnabled, getRecentActionEvents } from "@/app/actions/sanctions";
import SanctionsAdminClient from "./sanctions-admin-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function SanctionsDataFetcher() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const pointsEnabled = await isPointsSystemEnabled();

  const [{ data: sanctions }, sanctionTypes, students, actionEvents] = await Promise.all([
    getSanctions(),
    getSanctionTypes(),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      select: { id: true, firstName: true, lastName: true, class: { select: { id: true, name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    pointsEnabled ? getRecentActionEvents(50) : Promise.resolve([]),
  ]);

  const formattedStudents = students.map((s) => ({
    id: s.id,
    name: `${s.lastName} ${s.firstName}`,
    className: s.class?.name || "Sans classe",
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Link href="/" className="hover:text-slate-600 transition-colors">Accueil</Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800">Sanctions</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 sm:text-3xl">Gestion Disciplinaire</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">Configurez les types de sanctions et attribuez-les aux élèves.</p>
        </header>
        <SanctionsAdminClient
          initialSanctions={sanctions as any}
          initialTypes={sanctionTypes as any}
          students={formattedStudents}
          pointsEnabled={pointsEnabled}
          actionEvents={actionEvents as any}
        />
      </div>
    </div>
  );
}
