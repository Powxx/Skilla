import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { setDispensation } from "../../actions";

export default async function AdminStudentDispensationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    include: { dispensations: true, class: true },
  });

  if (!student) redirect("/admin/students");

  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const dispensedIds = student.dispensations.map((d) => d.subjectId);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Dispenses : {student.firstName} {student.lastName}
      </h1>
      <div className="bg-white p-6 rounded-xl border">
        {subjects.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b">
            <span>{s.name}</span>
            <form
              action={async () => {
                "use server";
                await setDispensation(student.id, s.id, dispensedIds.includes(s.id) ? false : true);
              }}
            >
              <button
                className={`px-4 py-1 rounded text-xs font-bold ${
                  dispensedIds.includes(s.id) ? "bg-red-500 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {dispensedIds.includes(s.id) ? "Dispensé" : "Actif"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
