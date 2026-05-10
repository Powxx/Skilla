import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import AdminSubstitutionsClient from "./admin-substitutions-client";

export const dynamic = 'force-dynamic';

export default async function AdminSubstitutionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [requests, teachers, allSubjects] = await Promise.all([
    prisma.substitutionRequest.findMany({
      include: {
        lesson: {
          include: {
            subject: true,
            class: true,
            room: true
          }
        },
        originalTeacher: { select: { firstName: true, lastName: true } },
        substituteTeacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { role: "TEACHER" },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        subjects: { select: { id: true, name: true } }
      },
      orderBy: { lastName: 'asc' }
    }),
    prisma.subject.findMany({ orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Remplacements</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Demandes de Remplacement
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Gérez les demandes et assignez des professeurs remplaçants.
          </p>
        </header>

        <AdminSubstitutionsClient 
          initialRequests={requests} 
          teachers={teachers}
          allSubjects={allSubjects}
        />
      </div>
    </div>
  );
}
