import Link from "next/link";

export const metadata = {
  title: "Espace professeur",
};

export default function ProfHomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Espace professeur
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Choisissez une action ci-dessous.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href="/prof/notes"
            className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
          >
            Saisie des notes →
          </Link>
        </li>
        <li>
          <Link
            href="/prof/appel"
            className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
          >
            Appel · absences & retards →
          </Link>
        </li>
      </ul>
    </div>
  );
}
