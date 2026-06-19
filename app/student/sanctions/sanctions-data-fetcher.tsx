import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getStudentSanctions, isCommentsEnabled, isPointsSystemEnabled } from "@/app/actions/sanctions";
import SanctionsPortalList from "@/components/sanctions/sanctions-portal-list";
import Link from "next/link";

export default async function StudentSanctionsDataFetcher() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const [sanctions, commentsEnabled, pointsEnabled] = await Promise.all([
    getStudentSanctions(session.user.id),
    isCommentsEnabled(),
    isPointsSystemEnabled(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
        <Link href="/student/dashboard" className="hover:text-slate-600 transition-colors">
          Synthèse
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-800">Sanctions</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 sm:text-3xl">
          Suivi Disciplinaire
        </h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Historique des mesures et sanctions prises par l&apos;établissement.
        </p>
      </header>

      <SanctionsPortalList
        sanctions={sanctions as any}
        commentsEnabled={commentsEnabled}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        pointsEnabled={pointsEnabled}
        emptyTitle="Aucune sanction enregistrée"
        emptyDescription="Félicitations, vous n'avez fait l'objet d'aucune sanction ou avertissement."
      />
    </div>
  );
}
