import pathlib

p = pathlib.Path(r"C:\Users\rosse\OneDrive\Bureau\Prog\Skilla\app\parent\livret\page.tsx")
old = p.read_text(encoding="utf-8")

old = old.replace(
    "const { studentId: studentIdParam } = await searchParams;",
    "const { studentId: studentIdParam, semester: semesterParam } = await searchParams;",
)

old = old.replace(
    "  const student = await prisma.user.findUnique({ \n    where: { id: studentId },\n    include: { class: { include: { competencies: true } } } \n  });\n\n  if (!student) redirect(\"/parent\");\n\n  const evaluations = await prisma.evaluation.findMany({\n    where: { studentId: student.id }\n  });",
    "  const semesterId = Array.isArray(semesterParam) ? semesterParam[0] : semesterParam;\n\n  const student = await prisma.user.findUnique({ \n    where: { id: studentId },\n    include: { class: { include: { competencies: true } } } \n  });\n\n  if (!student) redirect(\"/parent\");\n\n  const evaluations = await prisma.evaluation.findMany({\n    where: { studentId: student.id, ...(semesterId ? { semesterId } : {}) }\n  });",
)

p.write_text(old, encoding="utf-8")
print("patched parent livret")
