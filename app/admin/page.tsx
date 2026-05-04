import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const pendingSubsCount = await prisma.substitutionRequest.count({
    where: { status: "PENDING" }
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 font-sans text-slate-900 bg-white min-h-screen">
      <h1 className="text-2xl font-semibold tracking-tight">
        Administration
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Choisissez une section ci-dessous.
      </p>
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4">Structure & Pédagogie</h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/admin/settings"
                className="block rounded-xl border border-blue-200 bg-blue-50/50 px-5 py-4 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100/50"
              >
                Configuration Core →
                <p className="text-[10px] text-blue-500 font-normal mt-0.5">Classes, Matières, Semestres</p>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/rooms"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Salles de Classe →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/planning"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Emploi du Temps →
              </Link>
            </li>
          </ul>

          <h2 className="text-lg font-medium text-slate-800 mb-4 mt-8">Personnel & RH</h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/admin/users"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Utilisateurs & Comptes →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/hr"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Pôle RH (Heures & Contrats) →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/substitutions"
                className="relative block rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-100"
              >
                Remplacements →
                {pendingSubsCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-bounce">
                    {pendingSubsCount}
                  </span>
                )}
              </Link>
            </li>
          </ul>

          <h2 className="text-lg font-medium text-slate-800 mb-4 mt-8">Liaisons & Contrats</h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/admin/relations/families"
                className="block rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                Relations Parents-Élèves →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/relations/contracts"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Contrats d'Alternance →
              </Link>
            </li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4">Accès Rapides</h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/prof"
                className="block rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Espace Professeur →
              </Link>
            </li>
            <li>
              <Link
                href="/student"
                className="block rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Espace Élève →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/impersonate"
                className="block rounded-xl border border-dashed border-slate-300 px-5 py-3 text-sm font-medium text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
              >
                Impersonnalisation →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
