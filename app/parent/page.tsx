import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { listParentChildrenSerialized } from "@/lib/parent-access";

export const metadata = {
  title: "Espace famille",
};

export default async function ParentHomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login");
  }

  const children = await listParentChildrenSerialized(session.user.id);
  const firstId = children[0]?.id;
  const q = firstId ? `?studentId=${firstId}` : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Espace famille
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Consultez le suivi scolaire.{" "}
        {children.length > 1 ? (
          <span className="text-slate-700">
            Plusieurs enfants sont rattachés : utilisez la liste dans la barre
            pour changer d’élève.
          </span>
        ) : null}
      </p>

      {!firstId ? (
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          Aucun élève n’est encore rattaché à votre compte. Contactez l’administration pour
          assurer la liaison parent / élève.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          <li>
            <Link
              href={`/parent/dashboard${q}`}
              className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
            >
              Tableau de bord →
            </Link>
          </li>
          <li>
            <Link
              href={`/parent/grades${q}`}
              className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
            >
              Notes de l’élève →
            </Link>
          </li>
          <li>
            <Link
              href={`/parent/absences${q}`}
              className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:bg-slate-50"
            >
              Absences & retards →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
