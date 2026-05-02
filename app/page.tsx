import Link from "next/link";
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
const stats = [
  {
    label: "Élèves suivis",
    value: "100",
    hint: "Profils élèves & notes",
  },
  {
    label: "Professeurs",
    value: "12",
    hint: "Équipe pédagogique",
  },
  {
    label: "Classes",
    value: "5",
    hint: "Groupes & cours",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
      >
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold tracking-tight text-white shadow-sm ring-1 ring-slate-900/10"
              aria-hidden
            >
              S
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                Skilla
              </p>
              <p className="text-xs text-slate-500">
                Vie scolaire & emplois du temps
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm outline-offset-2 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 active:bg-slate-950"
          >
            Connexion
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:gap-20 sm:px-8 sm:py-24">
        <section className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Espace numérique de travail
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.15]">
            Pilotez la scolarité : notes, cours, absences — au même endroit.
          </h1>
          <p className="mt-6 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Interface sobre pour élèves, enseignants et administration : classes,
            emplois du temps, notes et absences — alignée sur votre modèle de données
            (élèves, professeurs, cours, matières).
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-sky-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 sm:w-auto"
            >
              Accéder à mon espace
            </Link>
            <Link
              href="#statistiques"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Voir un aperçu de l’établissement
            </Link>
          </div>
        </section>

        <section
          id="statistiques"
          className="scroll-mt-28"
          aria-labelledby="stats-heading"
        >
          <div className="mb-10 text-center">
            <h2
              id="stats-heading"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Aperçu de l&apos;établissement (démonstration)
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Indicateurs fictifs pour illustrer le tableau de bord.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {stats.map((item) => (
              <li key={item.label}>
                <article className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:shadow-md">
                  <p className="text-sm font-medium text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">{item.hint}</p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white/80 py-6 text-center text-xs text-slate-500 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6">
          Skilla  Données d&apos;exemple non reliées à une
          base réelle sur cette page.
        </div>
      </footer>
    </div>
  );
}
