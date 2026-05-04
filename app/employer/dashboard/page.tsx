import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { loadEmployerDashboardPayload } from "@/lib/employer-dashboard-data";
import EmployerDashboardClient from "./employer-client";

export const metadata = {
  title: "Espace Tuteur — Entreprise",
};

export default async function EmployerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COMPANY_TUTOR") {
    redirect("/login");
  }

  const students = await loadEmployerDashboardPayload(session.user.id);

  if (!students) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">
          Aucun alternant rattaché à votre compte tuteur.
        </p>
        <p className="mt-2 text-sm">
          Contactez la Skilla Academy pour lier vos apprentis à votre compte.
        </p>
      </div>
    );
  }

  return (
    <EmployerDashboardClient students={students} />
  );
}
