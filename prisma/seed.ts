import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  const adminPasswordHash = await bcrypt.hash("adminpassword", SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: "admin@ecole.fr" },
    update: {
      password: adminPasswordHash,
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "École",
    },
    create: {
      email: "admin@ecole.fr",
      password: adminPasswordHash,
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "École",
    },
  });

  let capeClass = await prisma.class.findFirst({
    where: { name: "CAPE 1" },
  });

  if (!capeClass) {
    capeClass = await prisma.class.create({
      data: { name: "CAPE 1" },
    });
  }

  /** IDs fixes et uniques pour les matières (réutilisables dans le code / tests). */
  const subjectsSeed = [
    { id: "seed_subj_pratique_esthetique", name: "Pratique Esthétique" },
    { id: "seed_subj_francais", name: "Français" },
    { id: "seed_subj_pratique_coiffure", name: "Pratique Coiffure" },
    { id: "seed_subj_anglais", name: "Anglais" },
    { id: "seed_subj_chef_doeuvre", name: "Chef d'oeuvre" },
  ] as const;

  for (const subj of subjectsSeed) {
    await prisma.subject.upsert({
      where: { id: subj.id },
      update: { name: subj.name },
      create: { id: subj.id, name: subj.name },
    });
  }

  const demoStudents = [
    {
      email: "eleve1@ecole.fr",
      firstName: "Lucas",
      lastName: "Bernard",
    },
    {
      email: "eleve2@ecole.fr",
      firstName: "Emma",
      lastName: "Lefèvre",
    },
  ];

  for (const el of demoStudents) {
    const studentPasswordHash = await bcrypt.hash("elevepassword", SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: el.email },
      update: {
        password: studentPasswordHash,
        role: Role.STUDENT,
        firstName: el.firstName,
        lastName: el.lastName,
      },
      create: {
        email: el.email,
        password: studentPasswordHash,
        role: Role.STUDENT,
        firstName: el.firstName,
        lastName: el.lastName,
      },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: { classId: capeClass.id },
      create: {
        userId: user.id,
        classId: capeClass.id,
      },
    });
  }

  const parentPasswordHash = await bcrypt.hash("parentpassword", SALT_ROUNDS);
  const parentUser = await prisma.user.upsert({
    where: { email: "parent@ecole.fr" },
    update: {
      password: parentPasswordHash,
      role: Role.PARENT,
      firstName: "Marie",
      lastName: "Bernard",
    },
    create: {
      email: "parent@ecole.fr",
      password: parentPasswordHash,
      role: Role.PARENT,
      firstName: "Marie",
      lastName: "Bernard",
    },
  });

  const employerPasswordHash = await bcrypt.hash("employeurpassword", SALT_ROUNDS);
  const employerUser = await prisma.user.upsert({
    where: { email: "employeur@ecole.fr" },
    update: {
      password: employerPasswordHash,
      role: Role.EMPLOYER,
      firstName: "Mme",
      lastName: "Entreprise",
    },
    create: {
      email: "employeur@ecole.fr",
      password: employerPasswordHash,
      role: Role.EMPLOYER,
      firstName: "Mme",
      lastName: "Entreprise",
    },
  });

  const demoStudentRows = await prisma.student.findMany({
    where: {
      user: {
        email: { in: ["eleve1@ecole.fr", "eleve2@ecole.fr"] },
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const row of demoStudentRows) {
    await prisma.parentStudent.upsert({
      where: {
        parentUserId_studentId: {
          parentUserId: parentUser.id,
          studentId: row.id,
        },
      },
      update: {},
      create: {
        parentUserId: parentUser.id,
        studentId: row.id,
      },
    });
    await prisma.parentStudent.upsert({
      where: {
        parentUserId_studentId: {
          parentUserId: employerUser.id,
          studentId: row.id,
        },
      },
      update: {},
      create: {
        parentUserId: employerUser.id,
        studentId: row.id,
      },
    });
  }

  console.log(
    [
      "Seed terminé :",
      "  • Admin   : admin@ecole.fr  (mot de passe : adminpassword, stocké hashé bcrypt)",
      "  • Élèves : eleve1@ecole.fr, eleve2@ecole.fr  (mot de passe : elevepassword)",
      "  • Parent  : parent@ecole.fr  (mot de passe : parentpassword) — lien aux 2 élèves démo",
      "  • Employeur : employeur@ecole.fr  (mot de passe : employeurpassword) — mêmes accès famille",
      "  • Classe : CAPE 1",
      "  • Matières (5) : Pratique Esthétique, Français, Pratique Coiffure, Anglais, Chef d'oeuvre (IDs seed_subj_*)",
    ].join("\n"),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
