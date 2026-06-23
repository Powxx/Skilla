import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminMeetingsManager from "@/components/admin/admin-meetings-manager";
import { getGlobalSettings } from "@/app/actions/settings";
import { QUALIOPI_ENABLED_KEY } from "@/lib/qualiopi";
import { 
  Users, 
  Settings, 
  DoorOpen, 
  Calendar, 
  FileWarning, 
  ShieldCheck, 
  ShieldAlert,
  HeartHandshake, 
  Home, 
  ArrowRight,
  Briefcase,
  GraduationCap,
  ClipboardList,
  LayoutDashboard,
  Clock
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const [pendingSubsCount, pendingMeetings, scheduledMeetings, pendingSubs, globalSettings, meetingUsers] = await Promise.all([
    prisma.substitutionRequest.count({ where: { status: "PENDING" } }),
    prisma.meetingRequest.findMany({
      where: { status: "PENDING" },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { requestedAt: 'asc' }
    }),
    prisma.meetingRequest.findMany({
      where: { status: "SCHEDULED" },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { scheduledAt: 'asc' }
    }),
    prisma.substitutionRequest.findMany({
        where: { status: "PENDING" },
        include: { originalTeacher: { select: { firstName: true, lastName: true } } }
    }),
    getGlobalSettings(),
    prisma.user.findMany({
      where: { role: { in: ["STUDENT", "RESPONSIBLE", "COMPANY_TUTOR", "TEACHER"] } },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }]
    }),
  ]);

  const schoolName = globalSettings.find(s => s.key === "SCHOOL_NAME")?.value || "ECM Academie";
  const qualiopiEnabled = globalSettings.find(s => s.key === QUALIOPI_ENABLED_KEY)?.value !== "false";
  const meetingsEnabled = globalSettings.find(s => s.key === "MEETINGS_ENABLED")?.value !== "false";

  const mainActions = [
    { href: "/admin/dashboard", label: "Tour de Contrôle", sub: "KPIs & pilotage global", icon: LayoutDashboard, color: "text-violet-600", bg: "bg-violet-50" },
    { href: "/admin/settings", label: "Configuration", sub: "Core system & options", icon: Settings, color: "text-blue-600", bg: "bg-blue-50" },
    { href: "/admin/users", label: "Utilisateurs", sub: "Élèves, profs, admins", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { href: "/admin/planning", label: "Emploi du temps", sub: "Gérer le calendrier", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
    { href: "/admin/rooms", label: "Salles", sub: "Capacité & ressources", icon: DoorOpen, color: "text-amber-600", bg: "bg-amber-50" },
    { href: "/admin/settings/requirements", label: "Quotas Horaires", sub: "Heures par classe", icon: ClipboardList, color: "text-pink-600", bg: "bg-pink-50" },
    { href: "/admin/teachers/availability", label: "Disponibilités", sub: "Plages horaires profs", icon: Clock, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  const pedagogieActions = [
    { href: "/admin/livret", label: "Livrets", sub: "Suivi & Exploitation", icon: ClipboardList, color: "text-rose-600", bg: "bg-rose-50" },
    { href: "/admin/recap/competencies", label: "Compétences", sub: "Suivi global", icon: LayoutDashboard, color: "text-violet-600", bg: "bg-violet-50" },
    { href: "/admin/absences", label: "Absences", icon: FileWarning, color: "text-orange-600", bg: "bg-orange-50" },
    { href: "/admin/dispenses", label: "Dispenses", icon: ShieldCheck, color: "text-red-600", bg: "bg-red-50" },
    { href: "/admin/report-cards", label: "Bulletins", icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50" },
    { href: "/admin/teachers/subjects", label: "Habilitations", sub: "Profs & Matières", icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
    { href: "/admin/sanctions", label: "Sanctions", sub: "Suivi disciplinaire", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
  ];

  const relationsActions = [
    { href: "/admin/hr", label: "Gestion RH", sub: "Contrats & Paie", icon: Briefcase, color: "text-slate-600", bg: "bg-slate-50" },
    { href: "/admin/relations/families", label: "Familles", icon: Home, color: "text-cyan-600", bg: "bg-cyan-50" },
    { href: "/admin/relations/contracts", label: "Alternance", icon: HeartHandshake, color: "text-teal-600", bg: "bg-teal-50" },
    { href: "/admin/recap", label: "Récapitulatif", icon: LayoutDashboard, color: "text-slate-900", bg: "bg-slate-100" },
    ...(qualiopiEnabled
      ? [{ href: "/admin/qualiopi", label: "Qualiopi", sub: "Satisfaction & réclamations", icon: HeartHandshake, color: "text-violet-600", bg: "bg-violet-50" }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-8 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shrink-0">
        <div>
           <div className="flex items-center gap-3 mb-1">
              <span className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                 <ShieldCheck className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Pilotage Administratif</h1>
           </div>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-11">Gestion globale de la {schoolName}</p>
        </div>
        <div className="flex gap-3">
           <Link href="/admin/impersonate" className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm active:scale-95">
             <Users className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
             Impersonnalisation
           </Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
           
           {/* Section 1: Opérations Core */}
           <section className="space-y-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Fondamentaux Système</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mainActions.map((action) => (
                  <Link key={action.href} href={action.href} className="group flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{action.label}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{action.sub}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
           </section>

           {/* Section 2: Pédagogie & Suivi */}
           <section className="space-y-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Scolarité & Pédagogie</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {pedagogieActions.map((action) => (
                  <Link key={action.href} href={action.href} className="group flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center">
                    <div className={`h-12 w-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center mb-4 transition-transform group-hover:rotate-6`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-tight">{action.label}</p>
                    {action.sub && <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{action.sub}</p>}
                  </Link>
                ))}
              </div>
           </section>

           {/* Section 3: Relations & RH */}
           <section className="space-y-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">RH & Relations Externes</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {relationsActions.map((action) => (
                  <Link key={action.href} href={action.href} className="group flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center">
                    <div className={`h-12 w-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center mb-4 transition-transform group-hover:-rotate-6`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{action.label}</p>
                  </Link>
                ))}
              </div>
           </section>

           <div className="h-8"></div>
        </div>

        {/* Action Feed (Column 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6 bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200 h-fit lg:sticky lg:top-8">
           <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Flux d'Actions</h2>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
           </div>
           
           <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-1 border border-white/10">
                 <AdminMeetingsManager initialMeetings={pendingMeetings} scheduledMeetings={scheduledMeetings} users={meetingUsers} />
              </div>
              
              {pendingSubs.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-[2rem]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-4 flex items-center gap-2">
                     <FileWarning className="h-4 w-4" />
                     Remplacements ({pendingSubs.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingSubs.map(sub => (
                      <div key={sub.id} className="text-[11px] font-bold p-3 bg-white/5 text-orange-200 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                          {sub.originalTeacher.firstName} {sub.originalTeacher.lastName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Info Card */}
              <div className="bg-blue-600 rounded-[2rem] p-6 text-white overflow-hidden relative group cursor-help">
                 <div className="absolute -right-4 -top-4 h-24 w-24 bg-blue-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Statut Serveur</h4>
                 <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
                    <p className="text-sm font-black uppercase">Système Nominal</p>
                 </div>
                 <p className="text-[9px] font-bold opacity-60 mt-3 uppercase leading-relaxed tracking-wider">Toutes les synchronisations sont à jour.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
