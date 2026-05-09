import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AdminRecapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: {
      class: true,
      responsibles: {
        select: { firstName: true, lastName: true, email: true }
      },
      studentContracts: {
        include: {
          tutor: { select: { firstName: true, lastName: true, email: true } }
        }
      }
    },
    orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }]
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Récapitulatif Global</h1>
            <p className="mt-2 text-slate-500 font-medium">Vision d'ensemble des liaisons Élèves / Parents / Employeurs.</p>
          </div>
          <Link 
            href="/admin/recap/report-cards"
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <span>Suivi des Bulletins</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </Link>
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-900 text-white uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-6 py-5 font-black">Élève & Classe</th>
                  <th className="px-6 py-5 font-black">Parents / Responsables</th>
                  <th className="px-6 py-5 font-black">Employeur / Tuteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-6 align-top">
                      <div className="font-bold text-slate-900 text-base">{s.lastName} {s.firstName}</div>
                      <div className="mt-1">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                          {s.class?.name || "Sans classe"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">{s.email}</div>
                    </td>
                    <td className="px-6 py-6 align-top">
                      {s.responsibles.length > 0 ? (
                        <ul className="space-y-3">
                          {s.responsibles.map((r, i) => (
                            <li key={i} className="group">
                              <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition">{r.firstName} {r.lastName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{r.email}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aucun responsable lié</span>
                      )}
                    </td>
                    <td className="px-6 py-6 align-top">
                      {s.studentContracts.length > 0 ? (
                        <ul className="space-y-4">
                          {s.studentContracts.map((c, i) => (
                            <li key={i} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{c.companyName}</div>
                              <div className="font-bold text-slate-900 text-sm">{c.tutor.firstName} {c.tutor.lastName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{c.tutor.email}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aucun contrat d'alternance</span>
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
