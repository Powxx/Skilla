import { PrismaClient, Role, AttendanceStatus, RhythmType, InternshipType } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Nettoyage de la base de données...")
  
  // L'ordre est CRUCIAL à cause des relations (clés étrangères)
  // On supprime d'abord les enfants, puis les parents
  await prisma.attendance.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.attendanceSheet.deleteMany()
  await prisma.grade.deleteMany()
  await prisma.evaluation.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.satisfactionSurvey.deleteMany()
  await prisma.companyContract.deleteMany()
  await prisma.teacherContract.deleteMany()
  await prisma.skillMatrix.deleteMany()
  
  // Enfin, on supprime les entités principales
  await prisma.user.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.class.deleteMany()
  await prisma.semester.deleteMany()

  console.log("🚀 Début du seeding...")

  // 1. SEMESTRE
  const semester = await prisma.semester.create({
    data: {
      name: "Semestre 1 - 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
    }
  })

  // 2. MATIÈRES
  const math = await prisma.subject.create({ data: { name: "Mathématiques" } })
  const dev = await prisma.subject.create({ data: { name: "Développement Fullstack" } })
  const gestion = await prisma.subject.create({ data: { name: "Gestion de Projet" } })

  // 3. UTILISATEURS : ADMIN & PROFS
  const admin = await prisma.user.create({
    data: {
      name: "Admin Skilla",
      email: "admin@skilla.edu",
      role: Role.ADMIN,
      address: "123 Rue de l'Innovation, 75001 Paris",
    }
  })
  const contractPayload: any = {
    hourlyRate: 55.5,
    monthlyHours: 120,
  };
  const profTitulaire = await prisma.user.create({
    data: {
      name: "M. Jean Titulaire",
      email: "jean@skilla.edu",
      role: Role.TEACHER,
      phone: "0601020304",
      subjects: { connect: [{ id: math.id }, { id: gestion.id }] },
      contract: {create: contractPayload}
    }
  })

  const profSubstitute = await prisma.user.create({
    data: {
      name: "Mme Sarah Remplaçante",
      email: "sarah@skilla.edu",
      role: Role.TEACHER,
      subjects: { connect: [{ id: dev.id }] },
      contract: { create: { hourlyRate: 48.0, monthlyHours: 40 } }
    }
  })

  // 4. ENTREPRISE & TUTEUR
  const tutor = await prisma.user.create({
    data: {
      name: "Marc Expert",
      email: "m.expert@tech-corp.fr",
      role: Role.COMPANY_TUTOR,
      address: "Technopole, 31000 Toulouse",
    }
  })

  // 5. CLASSE & ÉLÈVES
  const btsClass = await prisma.class.create({
    data: {
      name: "Bachelor Dev 2026",
      rhythm: RhythmType.ALTERNANCE_1_3 // Rythme CFA
    }
  })

  const parent = await prisma.user.create({
    data: {
      name: "Mme Durand (Responsable)",
      email: "parent.durand@mail.com",
      role: Role.RESPONSIBLE,
      phone: "0788990011"
    }
  })

  const student = await prisma.user.create({
    data: {
      name: "Lucas Durand",
      email: "l.durand@student.fr",
      role: Role.STUDENT,
      birthday: new Date("2005-05-15"),
      address: "10 Avenue des Étudiants, 31000 Toulouse",
      classId: btsClass.id,
      responsibles: { connect: [{ id: parent.id }] },
      studentContracts: {
        create: {
          companyName: "Tech Corp",
          type: InternshipType.APPRENTICESHIP,
          startDate: new Date("2025-09-01"),
          endDate: new Date("2027-08-31"),
          tutorId: tutor.id
        }
      }
    }
  })

  // 6. PLANNING : COURS NORMAL & COURS REMPLACÉ
  const lesson1 = await prisma.lesson.create({
    data: {
      startTime: new Date("2026-05-10T08:00:00Z"),
      endTime: new Date("2026-05-10T10:00:00Z"),
      subjectId: math.id,
      teacherId: profTitulaire.id,
      classId: btsClass.id
    }
  })

  const lesson2 = await prisma.lesson.create({
    data: {
      startTime: new Date("2026-05-10T10:30:00Z"),
      endTime: new Date("2026-05-10T12:30:00Z"),
      subjectId: dev.id,
      teacherId: profTitulaire.id, // Titulaire habituel
      substituteId: profSubstitute.id, // MAIS remplacé par Sarah
      replacementNote: "Absence exceptionnelle du titulaire",
      classId: btsClass.id
    }
  })

  // 7. ÉMARGEMENT & APPEL
  const sheet = await prisma.attendanceSheet.create({
    data: {
      date: new Date("2026-05-10"),
      classId: btsClass.id,
      lessons: { connect: [{ id: lesson1.id }, { id: lesson2.id }] }
    }
  })

  await prisma.attendance.create({
    data: {
      status: AttendanceStatus.LATE,
      lateDuration: 20,
      reason: "Panne de tram",
      studentId: student.id,
      lessonId: lesson1.id
    }
  })

  // 8. NOTES (Obligatoire + Bonus)
  await prisma.grade.createMany({
    data: [
      { value: 12.5, weight: 2, studentId: student.id, subjectId: math.id, semesterId: semester.id },
      { value: 19, weight: 1, isOptional: true, studentId: student.id, subjectId: math.id, semesterId: semester.id }
    ]
  })

  // 9. LIVRET D'APPRENTISSAGE & QUALIOPI
  await prisma.evaluation.create({
    data: {
      competency: "Installer un environnement de dev",
      level: 3,
      source: "ENTREPRISE",
      studentId: student.id
    }
  })

  await prisma.complaint.create({
    data: {
      subject: "Problème accès WiFi",
      description: "Le wifi ne fonctionne pas en salle 204",
      status: "OPEN",
      senderId: student.id
    }
  })

  console.log("✅ Base de données Skilla peuplée avec succès !")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })