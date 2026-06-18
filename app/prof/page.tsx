import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { loadTeacherDashboardPayload } from "@/lib/teacher-dashboard-data";
import Link from "next/link";
import { formatInTimeZone } from 'date-fns-tz';
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
    <div className="min-h-[80vh] flex flex-col gap-6 font-sans text-slate-900 pb-10">
      {/* Hero Welcome Mini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Espace Professeur</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Bonjour, {data.teacherName} • {data.lessonsTodayCount} cours aujourd'hui</p>
        </div>
        <div className="flex gap-2 shrink-0">
           <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Appels</span>
              <span className={`text-sm font-black ${data.pendingRollCallsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {data.pendingRollCallsCount} en attente
              </span>
           </div>
        </div>
      </div>

      <div className="flex-grow grid gap-6 lg:grid-cols-12">
        {/* Left Col: Quick Stats & Next Lesson */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <StatCard label="Aujourd'hui" value={data.lessonsTodayCount} color="blue" icon="👨‍🏫" href="/prof/planning" />
            <StatCard label="Appels" value={data.pendingRollCallsCount} color="amber" icon="📋" href="/prof/appel" />
            <StatCard label="Classes" value={data.classesCount} color="indigo" icon="🏫" />
            <StatCard label="Élèves" value={data.studentsCount} color="emerald" icon="👥" />
          </div>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm flex flex-col">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Prochain cours</h2>
            {data.nextLesson ? (
              <div className="flex flex-col">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{data.nextLesson.subject}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                      <span className="h-6 w-6 rounded-lg bg-white flex items-center justify-center shadow-sm">📍</span>
                      {data.nextLesson.room}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                      <span className="h-6 w-6 rounded-lg bg-white flex items-center justify-center shadow-sm">👥</span>
                      {data.nextLesson.class}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-blue-700 font-black">
                      <span className="h-6 w-6 rounded-lg bg-white flex items-center justify-center shadow-sm">⏰</span>
                      {formatInTimeZone(new Date(data.nextLesson.start), 'Europe/Paris', 'dd/MM à HH:mm')}
                    </div>
                  </div>
                <Link 
                  href="/prof/planning"
                  className="mt-6 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition shadow-sm"
                >
                  Ouvrir l'Emploi du temps
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                Aucun cours.
              </div>
            )}
          </section>
        </div>

        {/* Right Col: Recent Activity */}
        <div className="lg:col-span-8 flex flex-col">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Dernières séances & Appels</h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs border-collapse">
                 <thead className="bg-white border-b border-slate-100">
                   <tr>
                     <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Cours</th>
                     <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Date</th>
                     <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Statut</th>
                     <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {data.recentLessons.map((l) => (
                     <tr key={l.id} className="hover:bg-slate-50/50 transition group">
                       <td className="px-5 py-3">
                         <div className="font-black text-slate-900">{l.subject}</div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{l.class}</div>
                       </td>
                       <td className="px-5 py-3 font-bold text-slate-600">
                         {format(new Date(l.start), 'dd/MM HH:mm')}
                       </td>
                       <td className="px-5 py-3">
                         {l.isValidated ? (
                           <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-100">✓ FAIT</span>
                         ) : (
                           <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-100 animate-pulse">⚠ À FAIRE</span>
                         )}
                       </td>
                       <td className="px-5 py-3 text-right">
                         <Link 
                           href="/prof/appel" 
                           className="inline-block px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition"
                         >
                           {l.isValidated ? "Éditer" : "Appel"}
                         </Link>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {data.recentLessons.length === 0 && (
                 <div className="p-12 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                    Aucune séance récente.
                 </div>
               )}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, href }: { label: string, value: number, color: 'blue' | 'indigo' | 'amber' | 'emerald', icon: string, href?: string }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  const Content = (
    <div className={`p-4 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md ${colors[color]} ${href ? 'hover:scale-[1.02]' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        {href && <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">→</span>}
      </div>
      <p className="text-xl font-black tracking-tight leading-none">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1 truncate">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{Content}</Link> : Content;
}
