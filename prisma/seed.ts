// @ts-nocheck
import { PrismaClient, Role, AttendanceStatus, RhythmType, InternshipType, MeetingStatus, SubstitutionStatus } from '@prisma/client'
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
await prisma.reportCard.deleteMany() // Ajouté
await prisma.evaluation.deleteMany()
await prisma.complaint.deleteMany()
await prisma.satisfactionSurvey.deleteMany()
await prisma.meetingRequest.deleteMany()
await prisma.substitutionRequest.deleteMany()
await prisma.companyContract.deleteMany()
await prisma.teacherContract.deleteMany()
await prisma.skillMatrix.deleteMany()
await prisma.studentProfile.deleteMany()
await prisma.user.deleteMany()
await prisma.classCompetency.deleteMany() // Ajouté
await prisma.subject.deleteMany()
await prisma.class.deleteMany()
await prisma.semester.deleteMany()
await prisma.room.deleteMany()

  console.log("🚀 Début du seeding enrichi...")

  const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);

  // 1. SEMESTRES (3 items)
  const s1 = await prisma.semester.create({
    data: { name: "Semestre 1 - 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30") }
  })
  const s2 = await prisma.semester.create({
    data: { name: "Semestre 2 - 2026", startDate: new Date("2026-07-01"), endDate: new Date("2026-12-31") }
  })
  const s3 = await prisma.semester.create({
    data: { name: "Semestre 1 - 2025 (Archive)", startDate: new Date("2025-01-01"), endDate: new Date("2025-06-30") }
  })

  // 2. SALLES (3 items)
  const r1 = await prisma.room.create({ data: { name: "Salle 101 - Lab Info", capacity: 30 } })
  const r2 = await prisma.room.create({ data: { name: "Salle 202 - Amphithéâtre", capacity: 100 } })
  const r3 = await prisma.room.create({ data: { name: "Salle 003 - Coworking", capacity: 15 } })

  // 3. MATIÈRES (3 items)
  const math = await prisma.subject.create({ data: { name: "Mathématiques Appliquées" } })
  const dev = await prisma.subject.create({ data: { name: "Développement Fullstack" } })
  const ux = await prisma.subject.create({ data: { name: "UX/UI Design" } })

  // 4. CLASSES (3 items)
  const b1 = await prisma.class.create({ data: { name: "Bachelor 1 - Cyber", rhythm: RhythmType.WEEKLY } })
  const b2 = await prisma.class.create({ data: { name: "Bachelor 2 - Dev", rhythm: RhythmType.ALTERNANCE_1_3 } })
  const m1 = await prisma.class.create({ data: { name: "Mastère 1 - CTO", rhythm: RhythmType.ALTERNANCE_1_4 } })

  // 5. UTILISATEURS PAR RÔLE (3 par rôle majeur)

  // ADMINS
  const superAdmin = await prisma.user.create({ data: { firstName: "Super", lastName: "Admin", name: "Super Admin", email: "superadmin@skilla.edu", password: hashPassword("superadmin"), role: Role.SUPER_ADMIN } })
  const admin1 = await prisma.user.create({ data: { firstName: "Sophie", lastName: "Admin", name: "Sophie Admin", email: "sophie@skilla.edu", password: hashPassword("admin"), role: Role.ADMIN } })
  const admin2 = await prisma.user.create({ data: { firstName: "Thomas", lastName: "Directeur", name: "Thomas Directeur", email: "thomas@skilla.edu", password: hashPassword("admin"), role: Role.ADMIN } })
  const admin3 = await prisma.user.create({ data: { firstName: "Admin", lastName: "General", name: "Admin General", email: "admin@skilla.edu", password: hashPassword("admin"), role: Role.ADMIN } })

  // TEACHERS
  const t1 = await prisma.user.create({ 
    data: { 
      firstName: "Jean", lastName: "Dupon", name: "Jean Dupon", email: "jean@skilla.edu", password: hashPassword("teacher"), role: Role.TEACHER,
      subjects: { connect: [{ id: math.id }] },
      contract: { create: { hourlyRate: 45, annualHours: 80 } }
    } 
  })
  const t2 = await prisma.user.create({ 
    data: { 
      firstName: "Marie", lastName: "Curie", name: "Marie Curie", email: "marie@skilla.edu", password: hashPassword("teacher"), role: Role.TEACHER,
      subjects: { connect: [{ id: dev.id }] },
      contract: { create: { hourlyRate: 60, annualHours: 120 } }
    } 
  })
  const t3 = await prisma.user.create({ 
    data: { 
      firstName: "Paul", lastName: "Gauguin", name: "Paul Gauguin", email: "paul@skilla.edu", password: hashPassword("teacher"), role: Role.TEACHER,
      subjects: { connect: [{ id: ux.id }] },
      contract: { create: { hourlyRate: 55, annualHours: 60 } }
    } 
  })

  // STUDENTS & PROFILES
  const studentsData = [
    { fn: "Lucas", ln: "Durand", email: "lucas@skilla.edu", classId: b2.id },
    { fn: "Emma", ln: "Petit", email: "emma@skilla.edu", classId: b2.id },
    { fn: "Hugo", ln: "Blanc", email: "hugo@skilla.edu", classId: m1.id }
  ];

  const students = [];
  for (const s of studentsData) {
    const user = await prisma.user.create({
      data: {
        firstName: s.fn, lastName: s.ln, name: `${s.fn} ${s.ln}`, email: s.email, password: hashPassword("student"), role: Role.STUDENT, classId: s.classId,
        studentProfile: { create: { classId: s.classId } }
      }
    });
    students.push(user);
  }

  // 6. LESSONS (3 items)
  const l1 = await prisma.lesson.create({ data: { startTime: new Date("2026-05-12T08:00:00Z"), endTime: new Date("2026-05-12T10:00:00Z"), subjectId: math.id, teacherId: t1.id, classId: b2.id, roomId: r1.id } })
  const l2 = await prisma.lesson.create({ data: { startTime: new Date("2026-05-12T10:30:00Z"), endTime: new Date("2026-05-12T12:30:00Z"), subjectId: dev.id, teacherId: t2.id, classId: b2.id, roomId: r1.id } })
  const l3 = await prisma.lesson.create({ data: { startTime: new Date("2026-05-13T14:00:00Z"), endTime: new Date("2026-05-13T17:00:00Z"), subjectId: ux.id, teacherId: t3.id, classId: m1.id, roomId: r3.id } })

  // 7. GRADES (3 items)
  await prisma.grade.create({ data: { value: 14, coefficient: 1, studentId: students[0].id, subjectId: math.id, semesterId: s1.id, subjectName: "Mathématiques" } })
  await prisma.grade.create({ data: { value: 18, coefficient: 2, studentId: students[0].id, subjectId: dev.id, semesterId: s1.id, subjectName: "Développement Fullstack" } })
  await prisma.grade.create({ data: { value: 12, coefficient: 1, studentId: students[1].id, subjectId: math.id, semesterId: s1.id, subjectName: "Mathématiques" } })

  // 8. NOTIFICATIONS CONFIG (2 defaults)
  await prisma.notificationConfig.createMany({
    data: [
      { event: "NEW_GRADE", title: "Nouvelle note disponible", message: "Une nouvelle note a été publiée.", targetRoles: [Role.STUDENT], isEnabled: true },
      { event: "MEETING_UPDATE", title: "Mise à jour de RDV", message: "Le statut de votre demande a été modifié.", targetRoles: [Role.STUDENT, Role.RESPONSIBLE], isEnabled: true }
    ]
  })

  // 9. NOTIFICATIONS (3 items)
  await prisma.notification.createMany({
    data: [
      { userId: students[0].id, title: "Bienvenue", message: "Votre compte est prêt.", type: "SUCCESS" },
      { userId: students[0].id, title: "Note publiée", message: "Dev Fullstack : 18/20", type: "INFO", link: "/student/grades" },
      { userId: students[1].id, title: "Absence", message: "Merci de justifier votre absence.", type: "WARNING" }
    ]
  })

  // 10. MEETING REQUESTS (3 items)
  await prisma.meetingRequest.create({ data: { senderId: students[0].id, reason: "Difficultés en maths", status: MeetingStatus.PENDING } })
  await prisma.meetingRequest.create({ data: { senderId: students[1].id, reason: "Projet alternance", status: MeetingStatus.SCHEDULED, scheduledAt: new Date("2026-06-01T10:00:00Z") } })
  await prisma.meetingRequest.create({ data: { senderId: t1.id, reason: "Bilan pédagogique", status: MeetingStatus.PENDING } })

  // 11. SUBSTITUTION REQUESTS (3 items)
  await prisma.substitutionRequest.create({ data: { lessonId: l1.id, originalTeacherId: t1.id, status: SubstitutionStatus.PENDING } })
  await prisma.substitutionRequest.create({ data: { lessonId: l2.id, originalTeacherId: t2.id, substituteTeacherId: t3.id, status: SubstitutionStatus.APPROVED } })
  await prisma.substitutionRequest.create({ data: { lessonId: l3.id, originalTeacherId: t3.id, status: SubstitutionStatus.REJECTED } })

  console.log("✅ Seeding enrichi terminé !");
  console.log("🔑 Quelques comptes :");
  console.log("- admin@skilla.edu / admin");
  console.log("- jean@skilla.edu / teacher (Maths)");
  console.log("- lucas@skilla.edu / student");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
