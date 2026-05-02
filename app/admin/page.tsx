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
      <ul className="mt-8 space-y-3">
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
            href="/admin/students"
            className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
          >
            Gestion des élèves →
          </Link>
        </li>
      </ul>
    </div>
  );
}
