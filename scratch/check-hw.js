const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: { 
      homework: { not: "" } 
    },
    select: {
      id: true,
      homework: true,
      startTime: true,
      classId: true
    }
  });
  console.log(JSON.stringify(lessons, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
