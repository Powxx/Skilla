import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAdminLessonsWithAttendance } from "./actions";
import AdminAbsencesClient from "./admin-absences-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Gestion des Appels & Absences — Administration",
};

export default async function AdminAbsencesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [lessonsPayload, classes, subjects, teachers, rooms] = await Promise.all([
    getAdminLessonsWithAttendance(),
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
    prisma.room.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  return (
    <AdminAbsencesClient
      initialLessons={lessonsPayload}
      classes={classes}
      subjects={subjects}
      teachers={teachers.map(t => ({ id: t.id, firstName: t.firstName || "", lastName: t.lastName || "" }))}
      rooms={rooms}
    />
  );
}
