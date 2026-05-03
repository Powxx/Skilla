import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 font-sans text-slate-900">
      <h1 className="text-2xl font-semibold tracking-tight">
        Administration
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Choisissez une section ci-dessous.
      </p>
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4">Gestion</h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/admin/users"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Utilisateurs & rôles →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/teachers/subjects"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Matières des Professeurs →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/students"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Gestion des élèves →
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
                Gestion du Planning & Cours →
              </Link>
            </li>
            <li>
              <Link
                href="/admin/impersonate"
                className="block rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100"
              >
                Impersonnalisation (Se connecter en tant que...) →
              </Link>
            </li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4">Accès rapides aux espaces</h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/prof"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Espace Professeur →
              </Link>
            </li>
            <li>
              <Link
                href="/student"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Espace Élève →
              </Link>
            </li>
            <li>
              <Link
                href="/parent"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Espace Parent →
              </Link>
            </li>
            <li>
              <Link
                href="/employer"
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
              >
                Espace Entreprise →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
