import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminMeetingsManager from "@/components/admin/admin-meetings-manager";

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  // Fetch counts and pending items
  const [pendingSubsCount, pendingMeetings] = await Promise.all([
    prisma.substitutionRequest.count({ 
      where: { status: "PENDING" } 
    }),
    prisma.meetingRequest.findMany({
      where: { status: "PENDING" },
      include: { 
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            name: true
          }
        } 
      },
      orderBy: { requestedAt: 'asc' }
    })
  ]);

  return (
    <div className="mx-auto max-w-7xl font-sans text-slate-900">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
           <h1 className="text-3xl font-black tracking-tight text-slate-900">Administration</h1>
           <p className="mt-1 text-sm text-slate-500 font-medium">Pilotage global de la Skilla Academy.</p>
        </div>
        <div className="flex gap-3">
           <Link href="/admin/impersonate" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 transition shadow-sm">
             Impersonnalisation
           </Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Actions & Structure (8 cols) */}
        <div className="lg:col-span-8 grid gap-8 md:grid-cols-2">
           
           {/* Section 1: Pédagogie */}
           <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                 Structure & Pédagogie
              </h2>
              <div className="grid gap-3">
                 <Link href="/admin/settings" className="group flex justify-between items-center p-4 rounded-2xl bg-blue-50/50 border border-blue-100 hover:bg-blue-100/50 transition">
                    <div>
                       <p className="text-sm font-bold text-blue-900">Configuration Core</p>
                       <p className="text-[10px] text-blue-600 font-medium">Classes, Matières, Semestres</p>
                    </div>
                    <span className="text-blue-300 group-hover:translate-x-1 transition">→</span>
                 </Link>
                 <div className="grid grid-cols-2 gap-3">
                    <Link href="/admin/rooms" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-sm font-bold text-slate-700">Salles</Link>
                    <Link href="/admin/planning" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-sm font-bold text-slate-700">Planning</Link>
                 </div>
              </div>
           </section>

           {/* Section 2: RH & Personnel */}
           <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                 Personnel & RH
              </h2>
              <div className="grid gap-3">
                 <Link href="/admin/substitutions" className="relative group flex justify-between items-center p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition">
                    <div>
                       <p className="text-sm font-bold text-orange-900">Remplacements</p>
                       <p className="text-[10px] text-orange-600 font-medium">{pendingSubsCount} demande(s) en attente</p>
                    </div>
                    {pendingSubsCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                    <span className="text-orange-300 group-hover:translate-x-1 transition">→</span>
                 </Link>
                 <div className="grid grid-cols-2 gap-3">
                    <Link href="/admin/users" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-sm font-bold text-slate-700">Utilisateurs</Link>
                    <Link href="/admin/hr" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-sm font-bold text-slate-700">Pôle RH</Link>
                 </div>
              </div>
           </section>

           {/* Section 3: Liaisons & Suivi Global */}
           <section className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                 Liaisons & Suivi Global
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                 <Link href="/admin/relations/families" className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-100/50 transition">
                    <p className="text-xs font-bold text-emerald-900">Familles</p>
                    <p className="text-[9px] text-emerald-600 mt-0.5">Relations Parents-Élèves</p>
                 </Link>
                 <Link href="/admin/relations/contracts" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition">
                    <p className="text-xs font-bold text-slate-700">Alternance</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Contrats Entreprises</p>
                 </Link>
                 <Link href="/admin/recap" className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition">
                    <p className="text-xs font-bold text-indigo-900 text-center">📊 Récapitulatif Global</p>
                 </Link>
              </div>
              <Link href="/admin/recap/competencies" className="mt-4 block p-5 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700 transition text-center">
                 <p className="text-sm font-bold">🏆 Pilotage des Compétences École & Entreprise</p>
                 <p className="text-[10px] opacity-80 mt-0.5">Tableau de bord de progression consolidé</p>
              </Link>
           </section>
        </div>

        {/* Right Column: Dynamic Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
           <AdminMeetingsManager initialMeetings={pendingMeetings} />
           
           <section className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Accès Rapides</h2>
              <div className="space-y-2">
                 <Link href="/prof" className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-xs font-bold">Espace Professeur →</Link>
                 <Link href="/student" className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-xs font-bold">Espace Élève →</Link>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
