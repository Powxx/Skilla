import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createAttendance(formData: FormData) {
  "use server";
  const studentId = formData.get("studentId") as string;
  const lessonId = formData.get("lessonId") as string;
  const status = formData.get("status") as string;
  
  await prisma.attendance.create({
    data: {
      studentId,
      lessonId,
      status: status as any
    }
  });
  revalidatePath("/admin/absences");
}

export default async function AdminCreateAbsencePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) redirect("/login");

  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true, firstName: true, lastName: true } });
  const lessons = await prisma.lesson.findMany({ include: { subject: true } });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Créer une absence</h1>
      <form action={createAttendance} className="bg-white p-6 rounded-xl border space-y-4 max-w-lg">
        <label className="block text-sm">
            Élève
            <select name="studentId" className="w-full border p-2 rounded" required>
                {students.map(s => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
        </label>
        <label className="block text-sm">
            Cours
            <select name="lessonId" className="w-full border p-2 rounded" required>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.subject.name} ({l.startTime.toLocaleDateString()})</option>)}
            </select>
        </label>
        <label className="block text-sm">
            Statut
            <select name="status" className="w-full border p-2 rounded" required>
                <option value="ABSENT">Absent</option>
                <option value="EXCUSED">Justifié</option>
                <option value="LATE">Retard</option>
            </select>
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Créer</button>
      </form>
    </div>
  );
}
