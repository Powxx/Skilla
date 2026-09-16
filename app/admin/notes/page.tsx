import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAdminRecentGrades } from "./actions";
import RecentGradesClient from "./recent-grades-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Dernières Notes Émises — Administration",
};

export default async function AdminRecentGradesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [recentGradesData, classes, subjects, teachers, semesters] = await Promise.all([
    getAdminRecentGrades(),
    prisma.class.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    }),
    prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' }
    }),
    prisma.semester.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true }
    })
  ]);

  return (
    <RecentGradesClient
      initialData={recentGradesData}
      classes={classes}
      subjects={subjects}
      teachers={teachers.map(t => ({ id: t.id, firstName: t.firstName || "", lastName: t.lastName || "" }))}
      semesters={semesters}
    />
  );
}
