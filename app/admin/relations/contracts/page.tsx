import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import CompanyContractsClient from "./company-contracts-client";

export const dynamic = 'force-dynamic';

export default async function AdminContractsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [contracts, students, tutors] = await Promise.all([
    prisma.companyContract.findMany({
      include: {
        student: { select: { firstName: true, lastName: true } },
        tutor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { startDate: 'desc' }
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    }),
    prisma.user.findMany({
      where: { role: "COMPANY_TUTOR" },
      select: { id: true, firstName: true, lastName: true },
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
          <span className="text-slate-900">Contrats Alternance</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Contrats d'Alternance
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Gérez les liens entre les élèves, leurs entreprises et leurs tuteurs.
          </p>
        </header>

        <CompanyContractsClient 
          initialContracts={contracts} 
          students={students} 
          tutors={tutors} 
        />
      </div>
    </div>
  );
}
