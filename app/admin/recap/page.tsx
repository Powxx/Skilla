import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import RecapClient from "./recap-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Récapitulatif Global — Administration",
};

export default async function AdminRecapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const [students, classes] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      include: {
        class: {
          select: { id: true, name: true }
        },
        responsibles: {
          select: { firstName: true, lastName: true, email: true, phone: true }
        },
        studentContracts: {
          include: {
            tutor: { select: { firstName: true, lastName: true, email: true, phone: true } }
          }
        }
      },
      orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }]
    }),
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Récapitulatif Global</h1>
            <p className="mt-2 text-slate-500 font-medium">
              Vision d'ensemble et recherche des liaisons Élèves / Parents / Entreprises avec coordonnées téléphoniques.
            </p>
          </div>
          <Link 
            href="/admin/recap/report-cards"
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <span>Suivi des Bulletins</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </Link>
        </header>

        <RecapClient 
          initialStudents={JSON.parse(JSON.stringify(students))} 
          classes={classes} 
        />
      </div>
    </div>
  );
}
