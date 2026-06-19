import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { resolveParentStudentId } from "@/lib/parent-access";
import { getStudentSanctions, isCommentsEnabled, isPointsSystemEnabled } from "@/app/actions/sanctions";
import prisma from "@/lib/prisma";
import SanctionsPortalList from "@/components/sanctions/sanctions-portal-list";
import Link from "next/link";

export default async function ParentSanctionsDataFetcher({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "RESPONSIBLE") {
    redirect("/login");
  }

  const searchParams = await searchParamsPromise;
  const studentIdParam = searchParams.studentId;
  const studentId = await resolveParentStudentId(session.user.id, studentIdParam);

  if (!studentId) {
    redirect("/parent");
  }

  const [student, sanctions, commentsEnabled, pointsEnabled] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      include: { class: true },
    }),
    getStudentSanctions(studentId),
    isCommentsEnabled(),
    isPointsSystemEnabled(),
  ]);

  if (!student) {
    redirect("/parent");
  }

  const suffix = `?studentId=${studentId}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
        <Link href={`/parent/dashboard${suffix}`} className="hover:text-slate-600 transition-colors">
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
          Dossier disciplinaire de votre enfant :{" "}
          <span className="text-slate-800 font-bold">
            {student.firstName} {student.lastName}
          </span>{" "}
          ({student.class?.name || "Sans classe"})
        </p>
      </header>

      <SanctionsPortalList
        sanctions={sanctions as any}
        commentsEnabled={commentsEnabled}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        pointsEnabled={pointsEnabled}
        emptyTitle="Aucune sanction enregistrée"
        emptyDescription="Votre enfant ne fait l'objet d'aucune sanction ou avertissement en cours."
      />
    </div>
  );
}
