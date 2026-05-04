import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { loadTeacherDashboardPayload } from "@/lib/teacher-dashboard-data";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Espace Professeur — Skilla",
};

export default async function ProfHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const data = await loadTeacherDashboardPayload(session.user.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">Bonjour, {data.teacherName} 👋</h1>
          <p className="mt-2 text-slate-400 font-medium">Vous avez {data.lessonsTodayCount} cours prévus aujourd'hui.</p>
        </div>
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Appels en attente" 
          value={data.pendingRollCallsCount} 
          color="amber" 
          icon="📋"
          href="/prof/appel"
        />
        <StatCard 
          label="Cours aujourd'hui" 
          value={data.lessonsTodayCount} 
          color="blue" 
          icon="👨‍🏫"
          href="/prof/planning"
        />
        <StatCard 
          label="Classes suivies" 
          value={data.classesCount} 
          color="indigo" 
          icon="🏫"
        />
        <StatCard 
          label="Total Élèves" 
          value={data.studentsCount} 
          color="emerald" 
          icon="👥"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Next Lesson Card */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-blue-600"></span>
             Prochain cours
          </h2>
          {data.nextLesson ? (
            <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm ring-1 ring-blue-900/5 transition hover:shadow-md">
              <div className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4">À venir</div>
              <h3 className="text-xl font-bold text-slate-900">{data.nextLesson.subject}</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">📍</span>
                  {data.nextLesson.room}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">👥</span>
                  Classe {data.nextLesson.class}
                </div>
                <div className="flex items-center gap-3 text-sm text-blue-700 font-bold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm text-blue-600">⏰</span>
                  {format(new Date(data.nextLesson.start), 'HH:mm', { locale: fr })}
                </div>
              </div>
              <Link 
                href="/prof/planning"
                className="mt-6 block w-full py-3 bg-white border border-blue-200 text-blue-600 rounded-2xl text-center text-xs font-bold uppercase tracking-wider hover:bg-blue-100 transition shadow-sm"
              >
                Voir le planning
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-400 italic text-sm">
              Plus de cours prévu pour le moment.
            </div>
          )}
        </div>

        {/* Recent Lessons / Roll Call Reminder */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-slate-900"></span>
             Dernières séances
          </h2>
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm border-collapse">
                 <thead className="bg-slate-50 border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Cours</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Date & Heure</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Appel</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {data.recentLessons.map((l) => (
                     <tr key={l.id} className="hover:bg-slate-50/50 transition">
                       <td className="px-6 py-4">
                         <div className="font-bold text-slate-900">{l.subject}</div>
                         <div className="text-xs text-slate-500">{l.class}</div>
                       </td>
                       <td className="px-6 py-4 text-slate-600 font-medium">
                         {format(new Date(l.start), 'dd/MM HH:mm', { locale: fr })}
                       </td>
                       <td className="px-6 py-4">
                         {l.isValidated ? (
                           <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">
                             ✓ FAIT
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 border border-amber-100">
                             ⚠ À FAIRE
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-4">
                         <Link 
                           href="/prof/appel" 
                           className="text-blue-600 font-bold hover:underline text-xs"
                         >
                           {l.isValidated ? "Modifier" : "Faire l'appel"}
                         </Link>
                       </td>
                     </tr>
                   ))}
                   {data.recentLessons.length === 0 && (
                     <tr>
                       <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                         Aucune séance récente trouvée.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, href }: { label: string, value: number, color: 'blue' | 'indigo' | 'amber' | 'emerald', icon: string, href?: string }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 ring-blue-500/10",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10",
    amber: "bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10"
  };

  const Content = (
    <div className={`group rounded-3xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colors[color]} ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {href && <span className="text-xs font-bold opacity-0 transition group-hover:opacity-100">Ouvrir →</span>}
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{Content}</Link> : Content;
}
