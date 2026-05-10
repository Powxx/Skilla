import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { resolveTutorStudentId } from "@/lib/employer-access";

export default async function EmployerHomePage() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "COMPANY_TUTOR" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    redirect("/login");
  }

  const studentId = await resolveTutorStudentId(session.user.id, undefined);
  
  if (studentId) {
    redirect(`/employer/dashboard?studentId=${studentId}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Espace Employeur</h1>
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-900 shadow-sm">
        <p className="font-bold text-lg">Aucun alternant rattaché</p>
        <p className="mt-2 text-sm opacity-80">
          Votre compte n'est actuellement lié à aucun apprenti. 
          Veuillez contacter l'administration de ECM Academie pour régulariser votre contrat de tutorat.
        </p>
      </div>
    </div>
  );
}
