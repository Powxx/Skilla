import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import AdminDispensesClient from "./admin-dispenses-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gestion des Dispenses — Administration",
  description: "Matrice et gestion des dispenses d'évaluations par classe et par étudiant.",
};

export default async function AdminDispensesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const { classId } = await searchParams;

  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      include: {
        requirements: {
          select: { subjectId: true },
        },
        students: {
          where: { isActive: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          include: {
            dispensations: {
              select: {
                id: true,
                subjectId: true,
                reason: true,
              },
            },
          },
        },
      },
    }),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const serializedClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    classSubjectIds: c.requirements.map((r) => r.subjectId),
    students: c.students.map((st) => ({
      id: st.id,
      firstName: st.firstName,
      lastName: st.lastName,
      email: st.email,
      dispensations: st.dispensations.map((d) => ({
        id: d.id,
        subjectId: d.subjectId,
        reason: d.reason,
      })),
    })),
  }));

  return (
    <AdminDispensesClient
      classes={serializedClasses}
      subjects={subjects}
      initialClassId={classId}
    />
  );
}

