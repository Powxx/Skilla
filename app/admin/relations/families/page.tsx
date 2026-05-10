import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import FamilyRelationsClient from "./family-relations-client";

export const dynamic = 'force-dynamic';

export default async function AdminFamiliesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [parents, students] = await Promise.all([
    prisma.user.findMany({
      where: { role: "RESPONSIBLE" },
      include: { students: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    })
  ]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Liaisons Familles</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Liaisons Parents-Élèves
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Reliez les comptes parents aux comptes élèves pour permettre le suivi familial.
          </p>
        </header>

        <FamilyRelationsClient parents={parents} students={students} />
      </div>
    </div>
  );
}
