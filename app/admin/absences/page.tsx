import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function updateAttendanceStatus(id: string, formData: FormData) {
  "use server";
  const status = formData.get("status") as string;
  await prisma.attendance.update({ where: { id }, data: { status: status as any } });
  revalidatePath("/admin/absences");
}

async function deleteAttendance(id: string) {
  "use server";
  await prisma.attendance.delete({ where: { id } });
  revalidatePath("/admin/absences");
}

export default async function AdminAbsencesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const attendances = await prisma.attendance.findMany({
    include: {
        student: { select: { firstName: true, lastName: true } },
        lesson: { include: { subject: true } }
    },
    orderBy: { lesson: { startTime: 'desc' } }
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestion des absences</h1>
          <a href="/admin/absences/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Nouvelle absence</a>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 font-bold text-slate-500">Date</th>
              <th className="py-3 font-bold text-slate-500">Élève</th>
              <th className="py-3 font-bold text-slate-500">Cours</th>
              <th className="py-3 font-bold text-slate-500">Statut</th>
              <th className="py-3 font-bold text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {attendances.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="py-4">{a.lesson.startTime.toLocaleDateString()}</td>
                <td className="py-4">{a.student.lastName} {a.student.firstName}</td>
                <td className="py-4">{a.lesson.subject.name}</td>
                <td className="py-4">
                    <form action={updateAttendanceStatus.bind(null, a.id)} className="flex items-center gap-2">
                        <select name="status" defaultValue={a.status} className="border rounded p-1 text-xs">
                            <option value="PRESENT">Présent</option>
                            <option value="ABSENT">Absent</option>
                            <option value="EXCUSED">Justifié</option>
                            <option value="LATE">Retard</option>
                        </select>
                        <button type="submit" className="text-blue-600 text-[10px] font-bold">OK</button>
                    </form>
                </td>
                <td className="py-4">
                    <form action={deleteAttendance.bind(null, a.id)}>
                        <button type="submit" className="text-red-600 hover:text-red-800 font-bold">Supprimer</button>
                    </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
