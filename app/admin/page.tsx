import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminActionFeedCollapsible from "@/components/admin/admin-action-feed-collapsible";
import AdminHubGrid from "@/components/admin/admin-hub-grid";
import { getGlobalSettings } from "@/app/actions/settings";
import { QUALIOPI_ENABLED_KEY } from "@/lib/qualiopi";
import { 
  Users, 
  ShieldCheck, 
  BookMarked,
  LayoutDashboard,
  Lightbulb
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const [
    pendingSubsCount,
    pendingMeetings,
    scheduledMeetings,
    pendingSubs,
    globalSettings,
    meetingUsers,
    teachers,
    allSubjects,
    activeHomeworkCount,
    pendingIdeasCount
  ] = await Promise.all([
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
      include: {
        lesson: {
          include: {
            subject: true,
            class: true,
            room: true
          }
        },
        originalTeacher: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    getGlobalSettings(),
    prisma.user.findMany({
      where: { role: { in: ["STUDENT", "RESPONSIBLE", "COMPANY_TUTOR", "TEACHER"] }, isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }]
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        subjects: { select: { id: true, name: true } }
      },
      orderBy: { lastName: 'asc' }
    }),
    prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    prisma.lesson.count({
      where: {
        homework: { not: null },
        startTime: { gte: new Date() },
        isCancelled: false,
      }
    }),
    (prisma as any).adminIdea?.count
      ? (prisma as any).adminIdea.count({
          where: {
            status: "SUBMITTED"
          }
        })
      : Promise.resolve(0)
  ]);

  const schoolName = globalSettings.find(s => s.key === "SCHOOL_NAME")?.value || "ECM Academie";
  const qualiopiEnabled = globalSettings.find(s => s.key === QUALIOPI_ENABLED_KEY)?.value === "true";

  return (
    <div className="flex flex-col gap-8 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shrink-0">
        <div>
           <div className="flex items-center gap-3 mb-1">
              <span className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                 <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
                  Hub Administration
                </h1>
              </div>
           </div>
           <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-wider ml-13">
             Supervision & Pilotage • {schoolName}
           </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
           <Link
             href="/admin/idees"
             className="group flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all shadow-sm active:scale-95"
           >
             <Lightbulb className="h-4 w-4 text-amber-600" />
             Boîte à idées ({pendingIdeasCount})
           </Link>

           <Link
             href="/admin/devoirs"
             className="group flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-xs font-bold hover:bg-blue-100 transition-all shadow-sm active:scale-95"
           >
             <BookMarked className="h-4 w-4" />
             Devoirs en cours ({activeHomeworkCount})
           </Link>

           <Link
             href="/admin/dashboard"
             className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:border-slate-400 transition-all shadow-sm active:scale-95"
           >
             <LayoutDashboard className="h-4 w-4" />
             Tour de contrôle
           </Link>

           <Link
             href="/admin/impersonate"
             className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm active:scale-95"
           >
             <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
             Impersonnalisation
           </Link>
        </div>
      </header>

      {/* Collapsible Action Feed: Gathers urgent meetings and substitutions without squishing the HUB */}
      <AdminActionFeedCollapsible
        pendingMeetings={pendingMeetings}
        scheduledMeetings={scheduledMeetings}
        meetingUsers={meetingUsers}
        pendingSubs={pendingSubs as any}
        teachers={teachers as any}
        allSubjects={allSubjects as any}
      />

      {/* Main Full-Width HUB Grid */}
      <main className="w-full">
        <AdminHubGrid qualiopiEnabled={qualiopiEnabled} />
      </main>
    </div>
  );
}
