import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getStudentSanctions } from "@/app/actions/sanctions";
import { ShieldAlert, Clock, User, FileText } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mes Sanctions — Espace Élève",
};

export default async function StudentSanctionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const sanctions = await getStudentSanctions(session.user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Navigation Breadcrumb */}
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
          Historique des mesures et sanctions prises par l'établissement.
        </p>
      </header>

      {sanctions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            ✓
          </div>
          <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">
            Aucune sanction enregistrée
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Félicitations, vous n'avez fait l'objet d'aucune sanction ou avertissement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sanctions.map((s) => {
            const formattedDate = new Date(s.date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            return (
              <div
                key={s.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition flex flex-col md:flex-row gap-6 justify-between items-start md:items-center"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100 shadow-sm">
                      <ShieldAlert className="h-3 w-3" />
                      {s.sanctionType.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      <Clock className="h-3.5 w-3.5" />
                      Le {formattedDate}
                    </span>
                    {s.duration && (
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-tight">
                        Durée : {s.duration}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 font-semibold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-150 whitespace-pre-line">
                    {s.reason}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 w-full md:w-auto">
                  <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      Décidé par
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      M. / Mme. {s.givenBy.lastName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
