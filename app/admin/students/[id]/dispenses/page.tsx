import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import StudentDispensesClient from "./student-dispenses-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await prisma.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });

  return {
    title: student
      ? `Dispenses : ${(student.lastName || "").toUpperCase()} ${student.firstName || ""} — Administration`
      : "Dispenses de l'élève — Administration",
  };
}

export default async function AdminStudentDispensationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      dispensations: {
        orderBy: { createdAt: "desc" },
      },
      class: {
        include: {
          requirements: {
            select: { subjectId: true },
          },
        },
      },
    },
  });

  if (!student) {
    redirect("/admin/students");
  }

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  const classSubjectIds = new Set(
    student.class?.requirements.map((r) => r.subjectId) || []
  );

  const enrichedSubjects = subjects.map((sub) => ({
    id: sub.id,
    name: sub.name,
    isClassSubject: classSubjectIds.has(sub.id),
  }));

  // Structure serializable pour le Client Component
  const serializableStudent = {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    class: student.class ? { id: student.class.id, name: student.class.name } : null,
    dispensations: student.dispensations.map((d) => ({
      id: d.id,
      subjectId: d.subjectId,
      reason: d.reason,
      createdAt: d.createdAt.toISOString(),
    })),
  };

  return (
    <StudentDispensesClient
      student={serializableStudent}
      subjects={enrichedSubjects}
    />
  );
}

