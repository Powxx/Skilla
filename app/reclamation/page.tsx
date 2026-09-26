import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isQualiopiEnabled } from "@/lib/qualiopi";
import { getUserComplaints } from "@/app/actions/qualiopi";
import UserComplaintClient from "@/components/qualiopi/UserComplaintClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Réclamations & Suggestions — Qualiopi RNQ",
  description: "Espace officiel d'enregistrement des réclamations et suggestions qualité.",
};

function getHomeDashboard(role: string): string {
  if (role === "STUDENT") return "/student/dashboard";
  if (role === "TEACHER") return "/prof";
  if (role === "RESPONSIBLE") return "/parent/dashboard";
  if (role === "COMPANY_TUTOR") return "/employer/dashboard";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin/qualiopi";
  return "/";
}

export default async function ReclamationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Vérifier si Qualiopi est activé dans les paramètres globaux
  const enabled = await isQualiopiEnabled();
  if (!enabled) {
    redirect(getHomeDashboard(session.user.role));
  }

  const complaints = await getUserComplaints();
  const returnHref = getHomeDashboard(session.user.role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={returnHref}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à mon espace</span>
          </Link>
        </div>

        <UserComplaintClient
          initialComplaints={complaints}
          userName={session.user.name || undefined}
        />
      </div>
    </div>
  );
}
