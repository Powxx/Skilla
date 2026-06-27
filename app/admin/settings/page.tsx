import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import CoreSettingsClient from "./core-settings-client";
import { getNotificationConfigs } from "@/app/actions/notifications";
import { getGlobalSettings } from "@/app/actions/settings";

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [classes, subjects, semesters, notificationConfigs, holidays, globalSettings, teachers, schoolYears] = await Promise.all([
    prisma.class.findMany({ orderBy: { name: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    prisma.semester.findMany({ orderBy: { startDate: 'asc' }, include: { schoolYear: true } }),
    getNotificationConfigs(),
    prisma.holiday.findMany({ orderBy: { date: 'asc' } }),
    getGlobalSettings(),
    prisma.user.findMany({ 
      where: { role: "TEACHER", isActive: true },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, canAccessLivrets: true }
    }),
    prisma.schoolYear.findMany({ orderBy: { startDate: 'desc' }, include: { semesters: true } }),
  ]);

  const settingsMap = (globalSettings || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Paramétrage</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Paramétrage du système
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Gérez les fondamentaux de l'école : classes, matières, périodes, jours fériés et notifications.
          </p>
        </header>

        <CoreSettingsClient 
          initialClasses={classes} 
          initialSubjects={subjects} 
          initialSemesters={semesters} 
          initialNotificationConfigs={notificationConfigs}
          initialHolidays={holidays}
          globalSettings={settingsMap}
          teachers={teachers}
          initialSchoolYears={schoolYears}
        />
      </div>
    </div>
  );
}
