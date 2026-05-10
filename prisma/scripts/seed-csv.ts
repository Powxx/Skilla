import { PrismaClient, Role, RhythmType } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const IMPORT_DIR = path.join(process.cwd(), 'data', 'import');

const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);

async function parseCSV<T>(filename: string): Promise<T[]> {
  const filePath = path.join(IMPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Fichier non trouvé : ${filename}. Passage au suivant.`);
    return [];
  }
  const csvData = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as T[]),
    });
  });
}

async function main() {
  console.log("🚀 Début du peuplement via CSV...");

  // 1. Salles
  const roomsData = await parseCSV<{ name: string; capacity?: string }>('rooms.csv');
  for (const row of roomsData) {
    await prisma.room.upsert({
      where: { name: row.name },
      update: { capacity: row.capacity ? parseInt(row.capacity) : null },
      create: { name: row.name, capacity: row.capacity ? parseInt(row.capacity) : null },
    });
  }
  console.log(`✅ ${roomsData.length} salles importées.`);

  // 2. Matières
  const subjectsData = await parseCSV<{ name: string }>('subjects.csv');
  for (const row of subjectsData) {
    await prisma.subject.upsert({
      where: { name: row.name },
      update: {},
      create: { name: row.name },
    });
  }
  console.log(`✅ ${subjectsData.length} matières importées.`);

  // 3. Semestres
  const semestersData = await parseCSV<{ name: string; startDate: string; endDate: string }>('semesters.csv');
  for (const row of semestersData) {
    await prisma.semester.create({
      data: {
        name: row.name,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
      },
    });
  }
  console.log(`✅ ${semestersData.length} semestres importés.`);

  // 4. Classes
  const classesData = await parseCSV<{ name: string; rhythm: string }>('classes.csv');
  for (const row of classesData) {
    await prisma.class.upsert({
      where: { name: row.name },
      update: { rhythm: (row.rhythm as RhythmType) || RhythmType.WEEKLY },
      create: { name: row.name, rhythm: (row.rhythm as RhythmType) || RhythmType.WEEKLY },
    });
  }
  console.log(`✅ ${classesData.length} classes importées.`);

  // 5. Utilisateurs
  const usersData = await parseCSV<{
    role: string;
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    className?: string;
    subjects?: string; // Comma separated subject names
  }>('users.csv');

  for (const row of usersData) {
    const role = (row.role as Role) || Role.STUDENT;
    const password = row.password || (role.toLowerCase());
    
    // Find class if student
    let classId: string | undefined;
    if (row.className) {
      const cls = await prisma.class.findUnique({ where: { name: row.className } });
      classId = cls?.id;
    }

    // Prepare subjects if teacher
    const subjectConnect: { id: string }[] = [];
    if (row.subjects && role === Role.TEACHER) {
      const subNames = row.subjects.split(',').map(s => s.trim());
      for (const name of subNames) {
        const sub = await prisma.subject.findUnique({ where: { name } });
        if (sub) subjectConnect.push({ id: sub.id });
      }
    }

    const userData = {
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      name: `${row.firstName} ${row.lastName}`,
      password: hashPassword(password),
      role: role,
      classId: classId,
    };

    const user = await prisma.user.upsert({
      where: { email: row.email },
      update: userData,
      create: {
        ...userData,
        subjects: subjectConnect.length > 0 ? { connect: subjectConnect } : undefined,
      },
    });

    // Create student profile if student
    if (role === Role.STUDENT && classId) {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { classId },
        create: { userId: user.id, classId },
      });
    }
  }
  console.log(`✅ ${usersData.length} utilisateurs importés.`);

  console.log("🏁 Peuplement terminé avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
