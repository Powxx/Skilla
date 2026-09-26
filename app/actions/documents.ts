"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getGlobalSettings } from "@/app/actions/settings";

export type OfficialDocumentType = 
  | "CERTIFICAT_SCOLARITE" 
  | "ATTESTATION_ASSIDUITE" 
  | "FICHE_ALTERNANCE";

export type StudentDocumentData = {
  student: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    birthday: string | null;
    email: string | null;
    address: string | null;
    className: string;
    classId: string | null;
  };
  schoolYear: {
    name: string;
    startDate: string;
    endDate: string;
  };
  attendance: {
    totalLessons: number;
    attendedLessons: number;
    absencesCount: number;
    excusedCount: number;
    latesCount: number;
    attendanceRate: number;
  };
  contract: {
    companyName: string;
    tutorName: string | null;
    type: string;
    startDate: string;
    endDate: string;
  } | null;
  schoolInfo: {
    name: string;
    shortName: string;
    address: string;
    phone: string;
    email: string;
    siret: string;
    directorName: string;
  };
  issuedAt: string;
  documentRef: string;
};

/**
 * Récupère toutes les données certifiées pour générer un document officiel.
 * Sécurisé par session : l'étudiant lui-même, ses parents liés, ou un membre du personnel.
 */
export async function getStudentDocumentData(studentId: string): Promise<{ ok: true; data: StudentDocumentData } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return { ok: false, error: "Non autorisé. Accès réservé exclusivement aux administrateurs de l'école." };
  }

  // 1. Récupération de l'étudiant
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      birthday: true,
      address: true,
      classId: true,
      class: { select: { id: true, name: true } },
      studentContracts: {
        where: { endDate: { gte: new Date(new Date().getFullYear() - 1, 8, 1) } },
        orderBy: { endDate: "desc" },
        take: 1,
        include: { tutor: { select: { firstName: true, lastName: true } } }
      }
    }
  });

  if (!student) {
    return { ok: false, error: "Étudiant introuvable." };
  }

  // 2. Année scolaire courante
  const now = new Date();
  let schoolYear = await prisma.schoolYear.findFirst({
    where: {
      startDate: { lte: now },
      endDate: { gte: now }
    }
  });

  if (!schoolYear) {
    schoolYear = await prisma.schoolYear.findFirst({
      orderBy: { startDate: "desc" }
    });
  }

  const schoolYearLabel = schoolYear?.name ?? `${now.getFullYear()}-${now.getFullYear() + 1}`;
  const schoolYearStart = schoolYear?.startDate ?? new Date(now.getFullYear(), 8, 1);
  const schoolYearEnd = schoolYear?.endDate ?? new Date(now.getFullYear() + 1, 6, 30);

  // 3. Calcul de l'assiduité pour l'attestation de présence
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: student.id,
      lesson: {
        startTime: { gte: schoolYearStart, lte: now },
        isCancelled: false
      }
    },
    select: {
      status: true,
      lateDuration: true,
      isConfirmed: true
    }
  });

  const totalLessons = attendances.length;
  let attendedLessons = 0;
  let absencesCount = 0;
  let excusedCount = 0;
  let latesCount = 0;

  for (const a of attendances) {
    if (a.status === "PRESENT") attendedLessons++;
    else if (a.status === "LATE") {
      attendedLessons++;
      latesCount++;
    } else if (a.status === "EXCUSED") {
      excusedCount++;
      attendedLessons++; // Compté comme justifié
    } else if (a.status === "ABSENT") {
      absencesCount++;
    }
  }

  const attendanceRate = totalLessons > 0 ? Math.round((attendedLessons / totalLessons) * 100) : 100;

  // 4. Paramètres de l'établissement
  const settings = await getGlobalSettings() || [];
  const getSetting = (k: string) => settings.find(s => s.key === k)?.value;

  const schoolInfo = {
    name: getSetting("SCHOOL_NAME") || "ECM Académie - Skilla",
    shortName: getSetting("SCHOOL_SHORT_NAME") || "Skilla",
    address: getSetting("SCHOOL_ADDRESS") || "12 Avenue de l'Académie, 75008 Paris",
    phone: getSetting("SCHOOL_PHONE") || "01 42 68 00 00",
    email: getSetting("SCHOOL_EMAIL") || "contact@ecm-academie.com",
    siret: getSetting("SCHOOL_SIRET") || "842 190 342 00018",
    directorName: getSetting("DIRECTOR_NAME") || "La Direction Pédagogique",
  };

  const activeContract = student.studentContracts[0] ?? null;
  const refHash = `${student.id.substring(0, 4).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    ok: true,
    data: {
      student: {
        id: student.id,
        fullName: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
        firstName: student.firstName ?? "",
        lastName: student.lastName ?? "",
        birthday: student.birthday ? student.birthday.toLocaleDateString("fr-FR") : null,
        email: student.email,
        address: student.address,
        className: student.class?.name ?? "Sans classe",
        classId: student.classId
      },
      schoolYear: {
        name: schoolYearLabel,
        startDate: schoolYearStart.toLocaleDateString("fr-FR"),
        endDate: schoolYearEnd.toLocaleDateString("fr-FR"),
      },
      attendance: {
        totalLessons,
        attendedLessons,
        absencesCount,
        excusedCount,
        latesCount,
        attendanceRate
      },
      contract: activeContract ? {
        companyName: activeContract.companyName,
        tutorName: activeContract.tutor ? `${activeContract.tutor.firstName ?? ""} ${activeContract.tutor.lastName ?? ""}`.trim() : null,
        type: activeContract.type === "APPRENTICESHIP" ? "Contrat d'Apprentissage" : "Convention de Stage",
        startDate: activeContract.startDate.toLocaleDateString("fr-FR"),
        endDate: activeContract.endDate.toLocaleDateString("fr-FR")
      } : null,
      schoolInfo,
      issuedAt: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      documentRef: refHash
    }
  };
}
