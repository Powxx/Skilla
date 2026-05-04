import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Récapitulatif Global — Administration",
};

export default async function AdminRecapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // On récupère tous les élèves avec leurs relations
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: {
      class: true,
      responsibles: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        }
      },
      studentContracts: {
        include: {
          tutor: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    },
    orderBy: {
      lastName: "asc"
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Récapitulatif des Étudiants</h1>
          <p className="mt-2 text-slate-600">Vue d'ensemble des liaisons administratives (Classe, Parents, Entreprise).</p>
        </header>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-900/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Classe</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Parents / Responsables</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employeur / Tuteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {s.lastName?.[0]}{s.firstName?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-slate-900">{s.lastName} {s.firstName}</div>
                          <div className="text-xs text-slate-500">{s.email || "Pas d'email"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                        {s.class?.name || "Non assignée"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {s.responsibles.length > 0 ? (
                        <div className="space-y-1">
                          {s.responsibles.map((r, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-semibold text-slate-700">{r.lastName} {r.firstName}</span>
                              {r.phone && <span className="text-slate-400 ml-1">({r.phone})</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aucun parent lié</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {s.studentContracts.length > 0 ? (
                        <div className="space-y-1">
                          {s.studentContracts.map((c, i) => (
                            <div key={i} className="text-xs">
                              <div className="font-semibold text-slate-700">{c.companyName}</div>
                              <div className="text-slate-400">Tuteur: {c.tutor.lastName} {c.tutor.firstName}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pas de contrat</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
