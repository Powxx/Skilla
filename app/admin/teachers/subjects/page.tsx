import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import TeacherSubjectsClient from "./teacher-subjects-client";
import Link from "next/link";

export const metadata = {
  title: "Matières des Professeurs — Administration",
};

export default async function AdminTeacherSubjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    include: { subjects: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  const subjects = await prisma.subject.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Matières des Professeurs</span>
        </nav>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Affectation des Matières
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Associez chaque professeur aux matières qu'il est habilité à enseigner.
            </p>
          </div>
        </header>

        <TeacherSubjectsClient teachers={teachers} subjects={subjects} />
      </div>
    </div>
  );
}
