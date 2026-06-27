import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import HRTeachersClient from "./hr-teachers-client";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function AdminHRTeachersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER", isActive: true },
    include: {
      contract: true,
      lessons: {
        where: {
          startTime: { gte: monthStart },
          endTime: { lte: monthEnd },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          isCancelled: true,
        }
      }
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin/hr" className="font-medium hover:text-slate-700">RH</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Suivi Professeurs</span>
        </nav>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Suivi des Professeurs
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Contrats, heures réalisées et prévisions de rémunération.
            </p>
          </div>
        </header>

        <HRTeachersClient initialTeachers={teachers} />
      </div>
    </div>
  );
}
