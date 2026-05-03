import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import AbsencesBody from "@/components/student/absences-body";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Absences & retards",
};

export default async function StudentAbsencesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Selon ton schéma, 'class' et 'absences' sont des relations directes du modèle User
  const studentData = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      class: true, // Relation directe dans User
      absences: {  // Relation directe dans User nommée 'absences'
        include: {
          lesson: {
            include: {
              subject: true, // Pour afficher la matière liée à l'absence
            },
          },
        },
        orderBy: {
          // On trie par l'heure de début du cours car Attendance n'a pas de champ date[cite: 3]
          lesson: { startTime: "desc" },
        },
      },
    },
  });

  if (!studentData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Aucun profil élève lié à ce compte.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-sky-800 underline">
          Retour au site
        </Link>
      </div>
    );
  }

  // Pour garder la compatibilité avec ton composant AbsencesBody qui attend peut-être
  // un champ 'attendances', on peut renommer 'absences' ici
  const formattedStudent = {
    ...studentData,
    attendances: studentData.absences,
  };

  return <AbsencesBody student={formattedStudent as any} />;
}