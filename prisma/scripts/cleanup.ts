import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Nettoyage de la base de données...");

  // Suppression dans l'ordre pour respecter les contraintes de clés étrangères
  const deleteOperations = [
    prisma.notification.deleteMany(),
    prisma.notificationConfig.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.attendanceSheet.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.reportCard.deleteMany(),
    prisma.evaluation.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.satisfactionSurvey.deleteMany(),
    prisma.meetingRequest.deleteMany(),
    prisma.substitutionRequest.deleteMany(),
    prisma.companyContract.deleteMany(),
    prisma.teacherContract.deleteMany(),
    prisma.skillMatrix.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.classCompetency.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.class.deleteMany(),
    prisma.semester.deleteMany(),
    prisma.room.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.globalSetting.deleteMany(),
  ];

  try {
    await prisma.$transaction(deleteOperations);
    console.log("✅ Base de données nettoyée avec succès.");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage :", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
