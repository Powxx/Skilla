import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import AdminDocumentsClient from "./admin-documents-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documents & Certifications — Administration",
  description: "Générateur officiel d'attestations et certificats de scolarité pour les étudiants.",
};

export default async function AdminDocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [classes, students] = await Promise.all([
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classId: true,
        class: { select: { name: true } }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    })
  ]);

  const studentOptions = students.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    classId: s.classId,
    className: s.class?.name || "Sans classe"
  }));

  return (
    <div className="max-w-6xl mx-auto py-4">
      <AdminDocumentsClient classes={classes} students={studentOptions} />
    </div>
  );
}
