import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminLivretManagerClient from "./livret-manager-client";

export const dynamic = 'force-dynamic';

export default async function AdminLivretPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [classes, students, semesters] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: { competencies: true }
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      include: { 
        evaluations: true,
        class: true
      },
      orderBy: { lastName: 'asc' }
    }),
    prisma.semester.findMany({
      orderBy: { startDate: 'desc' },
      include: { schoolYear: { select: { name: true } } }
    })
  ]);

  if (classes.length === 0) {
      return (
        <div className="p-12 text-center text-slate-500 italic">
          Aucune classe trouvée.
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 no-print">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gestion des Livrets</h1>
          <p className="mt-2 text-slate-500 font-medium">Consultez et imprimez les livrets d'apprentissage par élève.</p>
        </header>

        <AdminLivretManagerClient 
          classes={classes} 
          students={students} 
          semesters={semesters}
        />
      </div>
    </div>
  );
}
