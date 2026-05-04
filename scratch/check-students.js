const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: { 
      classId: "cmoq3gprr0008hq5g3c6yv8jq",
      role: "STUDENT"
    },
    select: {
      id: true,
      firstName: true,
      lastName: true
    }
  });
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
