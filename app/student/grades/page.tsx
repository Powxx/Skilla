import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import GradesBody from "@/components/student/grades-body";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Mes notes",
};

export default async function StudentGradesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Utilisation de Promise.all pour charger les données en parallèle
  const [student, subjectsFromDb] = await Promise.all([
    prisma.user.findUnique({
      // Correction : La clé primaire dans ton schéma pour User est 'id'
      where: { id: session.user.id },
      include: {
        class: true, // Relation directe dans User
        grades: {
          // Correction : Dans ton schéma, le champ s'appelle 'createdAt' et non 'date'
          orderBy: [{ createdAt: "desc" }],
          include: {
            subject: true, // Inclus pour afficher le nom de la matière par note
            semester: true, // Inclus pour filtrer par semestre
          }
        },
      },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Aucun profil élève lié à ce compte.</p>
        <p className="mt-2 text-sm">
          Si vous êtes élève et que ce message persiste, contactez l&apos;administration.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-sky-800 underline">
          Retour au site
        </Link>
      </div>
    );
  }

  // On passe les données au composant client avec un cast "as any" 
  // pour éviter les frictions de types TypeScript complexes au build
  return <GradesBody student={student as any} subjectsFromDb={subjectsFromDb} />;
}