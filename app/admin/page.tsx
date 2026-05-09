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
    <div className="h-full flex flex-col gap-6 font-sans text-slate-900">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div>
           <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Pilotage Administratif</h1>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestion globale de la ECM Academie</p>

        </div>
        <div className="flex gap-2">
           <Link href="/admin/impersonate" className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition shadow-sm">
             Impersonnalisation
           </Link>
        </div>
      </header>

      <div className="flex-1 grid gap-6 lg:grid-cols-12 min-h-0">
        {/* Left Column: Actions & Structure (8 cols) */}
        <div className="lg:col-span-8 overflow-y-auto pr-2 custom-scrollbar space-y-6">
           
           <div className="grid gap-6 md:grid-cols-2">
              {/* Section 1: Pédagogie */}
              <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Structure & Pédagogie
                 </h2>
                 <div className="grid gap-3">
                    <Link href="/admin/settings" className="group flex justify-between items-center p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-100 transition">
                       <div>
                          <p className="text-xs font-black text-blue-900">Configuration Core</p>
                          <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">Classes, Matières, Semestres</p>
                       </div>
                       <span className="text-blue-300 group-hover:translate-x-1 transition">→</span>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                       <Link href="/admin/rooms" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Salles</Link>
                       <Link href="/admin/planning" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Planning</Link>
                    </div>
                 </div>
              </section>

              {/* Section 2: RH & Personnel */}
              <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Personnel & RH
                 </h2>
                 <div className="grid gap-3">
                    <Link href="/admin/substitutions" className="relative group flex justify-between items-center p-3 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition">
                       <div>
                          <p className="text-xs font-black text-orange-900">Remplacements</p>
                          <p className="text-[9px] text-orange-600 font-bold uppercase tracking-tighter">{pendingSubsCount} demande(s) en attente</p>
                       </div>
                       {pendingSubsCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                       <span className="text-orange-300 group-hover:translate-x-1 transition">→</span>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                       <Link href="/admin/users" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Utilisateurs</Link>
                       <Link href="/admin/hr" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Pôle RH</Link>
                    </div>
                 </div>
              </section>
           </div>

           {/* Section 3: Liaisons & Suivi Global */}
           <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                 Liaisons & Suivi Global
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                 <Link href="/admin/relations/families" className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-100 transition">
                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-tighter">Familles</p>
                    <p className="text-[9px] text-emerald-600 font-bold tracking-tighter">Parents-Élèves</p>
                 </Link>
                 <Link href="/admin/relations/contracts" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Alternance</p>
                    <p className="text-[9px] text-slate-400 font-bold tracking-tighter">Contrats Entreprises</p>
                 </Link>
                 <Link href="/admin/recap" className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition flex items-center justify-center">
                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest text-center">📊 Récapitulatif</p>
                 </Link>
              </div>
              <Link href="/admin/recap/competencies" className="mt-4 block p-4 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700 transition text-center group">
                 <p className="text-xs font-black uppercase tracking-widest group-hover:scale-105 transition">🏆 Pilotage des Compétences</p>
                 <p className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-widest">Tableau de bord École & Entreprise</p>
              </Link>
           </section>
        </div>

        {/* Right Column: Dynamic Feed (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
           <section className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col min-h-0">
              <AdminMeetingsManager initialMeetings={pendingMeetings} />
           </section>
           
           <section className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl shrink-0">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Accès Rapides</h2>
              <div className="grid grid-cols-2 gap-2">
                 <Link href="/prof" className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-[9px] font-black uppercase tracking-widest text-center">Espace Professeur</Link>
                 <Link href="/student" className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-[9px] font-black uppercase tracking-widest text-center">Espace Élève</Link>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
