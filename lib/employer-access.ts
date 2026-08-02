import prisma from "@/lib/prisma";

/**
 * Extrait la première valeur d'un paramètre de requête HTTP (Query Parameter).
 * Utile pour gérer les cas où Next.js renvoie un tableau de chaînes au lieu d'une chaîne unique.
 */
function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Récupère et formate la liste ordonnée des étudiants (alternants) suivis par un tuteur entreprise.
 * 
 * @param tutorId ID de l'utilisateur ayant le rôle de tuteur en entreprise (tutorId).
 * @returns Tableau d'objets sérialisés contenant l'ID et le nom complet formaté.
 */
export async function listTutorStudentsSerialized(tutorId: string) {
  const contracts = await prisma.companyContract.findMany({
    where: { tutorId },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    },
    orderBy: {
      student: { lastName: "asc" }
    }
  });

  return contracts.map((c) => ({
    id: c.student.id,
    label: `${c.student.lastName} ${c.student.firstName}`,
  }));
}

/**
 * Résout l'ID de l'étudiant à afficher dans le tableau de bord du tuteur.
 * Si aucun ID n'est spécifié en paramètre de recherche ou si l'ID fourni n'appartient pas 
 * aux alternants suivis, renvoie l'ID du premier étudiant trouvé.
 * 
 * @param tutorId ID du tuteur en entreprise.
 * @param studentIdParam ID de l'étudiant extrait des paramètres de l'URL.
 * @returns L'ID de l'étudiant validé ou null s'il n'y a aucun contrat.
 */
export async function resolveTutorStudentId(
  tutorId: string,
  studentIdParam: string | string[] | undefined,
): Promise<string | null> {
  const contracts = await prisma.companyContract.findMany({
    where: { tutorId },
    select: { studentId: true },
  });
  
  const ids = contracts.map((c) => c.studentId);
  if (ids.length === 0) return null;
  
  const pref = firstParam(studentIdParam);
  if (pref && ids.includes(pref)) return pref;
  return ids[0] ?? null;
}

/**
 * Vérifie si un tuteur en entreprise est autorisé à accéder aux données d'un élève spécifique
 * (c'est-à-dire s'il existe un contrat de travail d'alternance actif ou historique entre eux).
 * 
 * @param tutorId ID du tuteur.
 * @param studentId ID de l'élève cible.
 * @returns true si l'accès est autorisé, false sinon.
 */
export async function tutorOwnsStudent(
  tutorId: string,
  studentId: string,
): Promise<boolean> {
  const contract = await prisma.companyContract.findFirst({
    where: {
      studentId: studentId,
      tutorId: tutorId,
    },
    select: { id: true },
  });
  return Boolean(contract);
}
