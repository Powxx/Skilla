import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TeacherAvailabilityClient from "./availability-client";
import Link from "next/link";

export default async function TeacherAvailabilityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [teachers, availabilities] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER" },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    }),
    prisma.teacherAvailability.findMany({
      include: { teacher: true },
      orderBy: [{ teacher: { lastName: 'asc' } }, { dayOfWeek: 'asc' }, { startTime: 'asc' }]
    })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Disponibilités Profs</span>
        </nav>

        <header className="mb-12">
          <h1 className="text-3xl font-black tracking-tight uppercase">Disponibilités des Professeurs</h1>
          <p className="mt-2 text-slate-500 font-medium italic">Définissez les créneaux horaires où chaque professeur est disponible pour enseigner.</p>
        </header>

        <TeacherAvailabilityClient 
          teachers={teachers} 
          initialAvailabilities={availabilities} 
        />
      </div>
    </div>
  );
}
