import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { loadStudentDashboardPayload } from "@/lib/student-dashboard-data";
import StudentDashboardClient from "./dashboard-client";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Tableau de bord — Élève",
};

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await loadStudentDashboardPayload({ id: session.user.id });

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">
          Aucun profil élève lié à ce compte utilisateur.
        </p>
        <p className="mt-2 text-sm">
          Contactez l’administration si le problème persiste.
        </p>
      </div>
    );
  }

  const globalSettings = await prisma.globalSetting.findMany({ where: { key: "MEETINGS_ENABLED" } });
  const meetingsEnabled = globalSettings[0]?.value !== "false";

  return (
    <StudentDashboardClient {...data} absencesDetailHref="/student/absences" enableMeetings={meetingsEnabled} />
  );
}
