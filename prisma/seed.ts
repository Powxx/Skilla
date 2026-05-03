// @ts-nocheck
import { PrismaClient, Role, AttendanceStatus, RhythmType, InternshipType } from '@prisma/client'
import bcrypt from "bcryptjs"; // Assure-toi d'avoir installé bcryptjs pour hacher les mots de passe

const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Nettoyage de la base de données...")

  // Suppression dans l'ordre pour respecter les contraintes de clés étrangères
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
  await prisma.studentProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.class.deleteMany()
  await prisma.semester.deleteMany()

  console.log("🚀 Début du seeding...")

  // Fonction utilitaire pour hacher les mots de passe
  const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);

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

  // 3. CRÉATION DES DIFFÉRENTS TYPES D'UTILISATEURS

  // --- ADMIN ---
  const admin = await prisma.user.create({
    data: {
      name: "Admin Skilla",
      email: "admin@skilla.edu",
      password: hashPassword("admin"), // Mot de passe : admin
      role: Role.ADMIN,
    }
  })

  // --- TEACHER (Professeur) ---
  const teacher = await prisma.user.create({
    data: {
      name: "Jean Enseignant",
      email: "teacher@skilla.edu",
      password: hashPassword("teacher"), // Mot de passe : teacher
      role: Role.TEACHER,
      subjects: { connect: [{ id: math.id }] },
      contract: { create: { hourlyRate: 50.0, monthlyHours: 100 } }
    }
  })

  // --- COMPANY_TUTOR (Tuteur en entreprise) ---
  const tutor = await prisma.user.create({
    data: {
      name: "Marc Tuteur",
      email: "tutor@tech.fr",
      password: hashPassword("company_tutor"), // Mot de passe : company_tutor
      role: Role.COMPANY_TUTOR,
    }
  })

  // --- RESPONSIBLE (Parent / Responsable légal) ---
  const parent = await prisma.user.create({
    data: {
      name: "Mme Responsable",
      email: "parent@mail.com",
      password: hashPassword("responsible"), // Mot de passe : responsible
      role: Role.RESPONSIBLE,
    }
  })

  // 4. CLASSE
  const btsClass = await prisma.class.create({
    data: {
      name: "Bachelor Dev 2026",
      rhythm: RhythmType.ALTERNANCE_1_3
    }
  })

  // --- STUDENT (Élève) ---
  const student = await prisma.user.create({
    data: {
      name: "Lucas Durand",
      email: "student@skilla.edu",
      password: hashPassword("student"),
      role: Role.STUDENT,
      classId: btsClass.id, // ID pour le modèle User
      responsibles: { connect: [{ id: parent.id }] },
      studentProfile: {
        create: {
          id: "prof_lucas_2026",
          classId: btsClass.id // AJOUTE CETTE LIGNE : c'est l'ID obligatoire pour StudentProfile
        }
      }
    }
  })

  // 5. PLANNING & EXEMPLES DE DONNÉES
  const lesson = await prisma.lesson.create({
    data: {
      startTime: new Date("2026-05-10T08:00:00Z"),
      endTime: new Date("2026-05-10T10:00:00Z"),
      subjectId: math.id,
      teacherId: teacher.id,
      classId: btsClass.id
    }
  })

  await prisma.attendance.create({
    data: {
      status: AttendanceStatus.PRESENT,
      studentId: student.id,
      lessonId: lesson.id
    }
  })

  await prisma.grade.create({
    data: {
      value: 15,
      coefficient: 2.0,
      studentId: student.id,
      subjectId: math.id,
      semesterId: semester.id
    }
  })

  console.log("✅ Base de données peuplée avec succès !");
  console.log("🔑 Comptes créés :");
  console.log("- admin@skilla.edu / admin");
  console.log("- teacher@skilla.edu / teacher");
  console.log("- student@skilla.edu / student");
  console.log("- parent@mail.com / responsible");
  console.log("- tutor@tech.fr / company_tutor");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })