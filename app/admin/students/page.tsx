import Link from "next/link";
import prisma from "@/lib/prisma";
import AddStudentModal from "./add-student-modal";
export const dynamic = 'force-dynamic';
export const metadata = {
  title: "Élèves — Administration",
};

export default async function AdminStudentsPage() {
  const students = await prisma.user.findMany({
    include: {
      user: true,
      class: true,
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });

  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const classPayload = classes.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">
            Accueil
          </Link>
          <span aria-hidden className="mx-2 text-slate-300">
            /
          </span>
          <Link href="/admin" className="font-medium hover:text-slate-700">
            Admin
          </Link>
          <span aria-hidden className="mx-2 text-slate-300">
            /
          </span>
          <Link href="/admin/users" className="font-medium hover:text-slate-700">
            Utilisateurs
          </Link>
          <span aria-hidden className="mx-2 text-slate-300">
            /
          </span>
          <span className="text-slate-900">Élèves</span>
        </nav>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Élèves
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Liste des profils élèves issue de{" "}
              <code className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
                prisma.user.findMany()
              </code>
              .
            </p>
          </div>
          <AddStudentModal classes={classPayload} />
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700"
                  >
                    Élève
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700"
                  >
                    E-mail
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700"
                  >
                    Classe
                  </th>
                  <th
                    scope="col"
                    className="hidden whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700 lg:table-cell"
                  >
                    ID élève
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Aucun élève en base. Lancez un seed ou ajoutez un élève avec
                      le bouton ci-dessus.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr
                      key={s.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {s.user.lastName}{" "}
                          <span className="font-normal text-slate-600">
                            {s.user.firstName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <a
                          href={`mailto:${s.user.email}`}
                          className="text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:decoration-sky-700"
                        >
                          {s.user.email}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200/80">
                          {s.class.name}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 font-mono text-xs text-slate-400 lg:table-cell">
                        {s.id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {classes.length === 0 ? (
          <p className="mt-4 text-sm text-amber-800">
            Aucune classe en base : créez d’abord une classe pour pouvoir
            affecter un nouvel élève.
          </p>
        ) : null}
      </div>
    </div>
  );
}
