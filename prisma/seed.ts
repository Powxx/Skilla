// @ts-nocheck
import { PrismaClient, Role, AttendanceStatus, RhythmType, InternshipType, MeetingStatus } from '@prisma/client'
import bcrypt from "bcryptjs";

const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Nettoyage de la base de données...")

  // Suppression dans l'ordre pour respecter les contraintes de clés étrangères
  await prisma.notification.deleteMany()
  await prisma.notificationConfig.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.attendanceSheet.deleteMany()
  await prisma.grade.deleteMany()
  await prisma.evaluation.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.satisfactionSurvey.deleteMany()
  await prisma.meetingRequest.deleteMany()
  await prisma.companyContract.deleteMany()
  await prisma.teacherContract.deleteMany()
  await prisma.skillMatrix.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.class.deleteMany()
  await prisma.semester.deleteMany()

  console.log("🚀 Début du seeding...")

  const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);

  // 1. CONFIG NOTIFICATIONS PAR DÉFAUT
  console.log("🔔 Initialisation des configurations de notifications...")
  await prisma.notificationConfig.createMany({
    data: [
      {
        event: "NEW_GRADE",
        title: "Nouvelle note disponible",
        message: "Une nouvelle note a été publiée.",
        targetRoles: [Role.STUDENT],
        isEnabled: true,
      },
      {
        event: "MEETING_UPDATE",
        title: "Mise à jour de votre demande de rendez-vous",
        message: "Le statut de votre demande a été modifié.",
        targetRoles: [Role.STUDENT, Role.RESPONSIBLE, Role.COMPANY_TUTOR],
        isEnabled: true,
      }
    ]
  })

  // 2. SEMESTRE
  const semester = await prisma.semester.create({
    data: {
      name: "Semestre 1 - 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
    }
  })

  // 3. MATIÈRES
  const math = await prisma.subject.create({ data: { name: "Mathématiques" } })
  const dev = await prisma.subject.create({ data: { name: "Développement Fullstack" } })

  // 4. CRÉATION DES UTILISATEURS

  const admin = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "Skilla",
      name: "Admin Skilla",
      email: "admin@skilla.edu",
      password: hashPassword("admin"),
      role: Role.ADMIN,
    }
  })

  const teacher = await prisma.user.create({
    data: {
      firstName: "Jean",
      lastName: "Enseignant",
      name: "Jean Enseignant",
      email: "teacher@skilla.edu",
      password: hashPassword("teacher"),
      role: Role.TEACHER,
      subjects: { connect: [{ id: math.id }] },
      contract: { create: { hourlyRate: 50.0, monthlyHours: 100 } }
    }
  })

  const tutor = await prisma.user.create({
    data: {
      firstName: "Marc",
      lastName: "Tuteur",
      name: "Marc Tuteur",
      email: "tutor@tech.fr",
      password: hashPassword("company_tutor"),
      role: Role.COMPANY_TUTOR,
    }
  })

  const parent = await prisma.user.create({
    data: {
      firstName: "Mme",
      lastName: "Responsable",
      name: "Mme Responsable",
      email: "parent@mail.com",
      password: hashPassword("responsible"),
      role: Role.RESPONSIBLE,
    }
  })

  const btsClass = await prisma.class.create({
    data: {
      name: "Bachelor Dev 2026",
      rhythm: RhythmType.ALTERNANCE_1_3
    }
  })

  const student = await prisma.user.create({
    data: {
      firstName: "Lucas",
      lastName: "Durand",
      name: "Lucas Durand",
      email: "student@skilla.edu",
      password: hashPassword("student"),
      role: Role.STUDENT,
      classId: btsClass.id,
      responsibles: { connect: [{ id: parent.id }] },
      studentProfile: {
        create: {
          classId: btsClass.id
        }
      }
    }
  })

  // 5. DONNÉES DE DÉMO (Planning, Notes, Notifs)

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
      semesterId: semester.id,
      subjectName: "Mathématiques"
    }
  })

  // Quelques notifications pour l'élève
  await prisma.notification.createMany({
    data: [
      {
        userId: student.id,
        title: "Bienvenue sur Skilla",
        message: "Votre compte a été créé avec succès. Explorez votre espace !",
        type: "SUCCESS",
        isRead: false,
      },
      {
        userId: student.id,
        title: "Nouvelle note",
        message: "Vous avez reçu un 15/20 en Mathématiques.",
        type: "INFO",
        isRead: false,
        link: "/student/grades"
      }
    ]
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
