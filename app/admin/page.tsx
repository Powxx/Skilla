import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminMeetingsManager from "@/components/admin/admin-meetings-manager";
import { getGlobalSettings } from "@/app/actions/settings";

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const [pendingSubsCount, pendingMeetings, pendingSubs, globalSettings] = await Promise.all([
    prisma.substitutionRequest.count({ where: { status: "PENDING" } }),
    prisma.meetingRequest.findMany({
      where: { status: "PENDING" },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { requestedAt: 'asc' }
    }),
    prisma.substitutionRequest.findMany({
        where: { status: "PENDING" },
        include: { originalTeacher: { select: { firstName: true, lastName: true } } }
    }),
    getGlobalSettings()
  ]);

  const schoolName = globalSettings.find(s => s.key === "SCHOOL_NAME")?.value || "ECM Academie";

  return (
    <div className="h-full flex flex-col gap-6 font-sans text-slate-900">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div>
           <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Pilotage Administratif</h1>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestion globale de la {schoolName}</p>
        </div>
        <div className="flex gap-2">
           <Link href="/admin/impersonate" className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition shadow-sm">
             Impersonnalisation
           </Link>
        </div>
      </header>

      <div className="flex-1 grid gap-6 lg:grid-cols-12 min-h-0">
        <div className="lg:col-span-8 overflow-y-auto pr-2 custom-scrollbar space-y-6">
           {/* Combined Operation Bloc */}
           <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
             <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Gestion Opérationnelle
             </h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/admin/settings" className="p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition text-[10px] font-black text-blue-900 uppercase tracking-tighter text-center">Config Core</Link>
                <Link href="/admin/users" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[10px] font-black text-slate-700 uppercase tracking-tighter text-center">Utilisateurs</Link>
                <Link href="/admin/rooms" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[10px] font-black text-slate-700 uppercase tracking-tighter text-center">Salles</Link>
                <Link href="/admin/planning" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[10px] font-black text-slate-700 uppercase tracking-tighter text-center">Emploi du temps</Link>
                <Link href="/admin/dispenses" className="p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition text-[10px] font-black text-red-900 uppercase tracking-tighter text-center">Gestion des Dispenses</Link>
                <Link href="/admin/hr" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition text-[10px] font-black text-slate-700 uppercase tracking-tighter text-center">Gestion RH</Link>
                <Link href="/admin/teachers/subjects" className="p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition text-[10px] font-black text-amber-900 uppercase tracking-tighter text-center">Habilitations Profs</Link>
             </div>
           </section>

           <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                 Liaisons & Suivi
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Link href="/admin/relations/families" className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-100 transition">
                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-tighter">Familles</p>
                 </Link>
                 <Link href="/admin/relations/contracts" className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Alternance</p>
                 </Link>
                 <Link href="/admin/recap" className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition flex items-center justify-center">
                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Récapitulatif</p>
                 </Link>
                 <Link href="/admin/recap/competencies" className="p-3 rounded-xl bg-violet-50 border border-violet-100 hover:bg-violet-100 transition flex items-center justify-center">
                    <p className="text-[10px] font-black text-violet-900 uppercase tracking-widest">Compétences</p>
                 </Link>
              </div>
           </section>
        </div>

        {/* Action Feed (Column 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0 bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
           <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Flux d'Actions</h2>
           <div className="flex-1 overflow-y-auto space-y-4">
              <AdminMeetingsManager initialMeetings={pendingMeetings} />
              
              {pendingSubs.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-orange-800 mb-3">Remplacements ({pendingSubs.length})</h3>
                  {pendingSubs.map(sub => (
                    <div key={sub.id} className="text-xs p-2 bg-white rounded border border-orange-100 mb-2">
                        {sub.originalTeacher.firstName} {sub.originalTeacher.lastName}
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
