import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setDispensation } from "./actions";

export default async function AdminStudentDispensationPage({ params }: { params: { id: string } }) {
  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: { dispensations: true, class: true }
  });

  if (!student) redirect("/admin/students");

  const subjects = await prisma.subject.findMany();
  const dispensedIds = student.dispensations.map(d => d.subjectId);

  return (
    <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Dispenses : {student.firstName} {student.lastName}</h1>
        <div className="bg-white p-6 rounded-xl border">
            {subjects.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b">
                    <span>{s.name}</span>
                    <form action={async (formData) => {
                        "use server";
                        await setDispensation(student.id, s.id, dispensedIds.includes(s.id) ? false : true);
                    }}>
                        <button className={`px-4 py-1 rounded ${dispensedIds.includes(s.id) ? 'bg-red-500 text-white' : 'bg-slate-200'}`}>
                            {dispensedIds.includes(s.id) ? "Dispensé" : "Actif"}
                        </button>
                    </form>
                </div>
            ))}
        </div>
    </div>
  );
}
