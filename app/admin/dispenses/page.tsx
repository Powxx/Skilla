import Link from "next/link";
import prisma from "@/lib/prisma";
import { setDispensation } from "@/app/admin/students/actions";

export const dynamic = 'force-dynamic';
export const metadata = { title: "Dispenses — Administration" };

export default async function AdminDispensesPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId } = await searchParams;

  const classes = await prisma.class.findMany({ include: { students: { include: { dispensations: true } } } });
  const subjects = await prisma.subject.findMany();

  const selectedClass = classId ? classes.find(c => c.id === classId) : classes[0];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Gestion des Dispenses</h1>
      
      <div className="flex gap-2 mb-6">
        {classes.map(c => (
            <Link key={c.id} href={`/admin/dispenses?classId=${c.id}`} className={`px-4 py-2 rounded-lg ${selectedClass?.id === c.id ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                {c.name}
            </Link>
        ))}
      </div>

      {selectedClass && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-100 text-left">
                        <th className="p-3">Élève</th>
                        {subjects.map(s => <th key={s.id} className="p-3 rotate-180" style={{writingMode: 'vertical-rl'}}>{s.name}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {selectedClass.students.map(student => (
                        <tr key={student.id} className="border-t">
                            <td className="p-3 font-medium">{student.lastName} {student.firstName}</td>
                            {subjects.map(s => {
                                const isDispensed = student.dispensations.some(d => d.subjectId === s.id);
                                return (
                                    <td key={s.id} className="p-3 text-center">
                                        <form action={async () => {
                                            "use server";
                                            await setDispensation(student.id, s.id, !isDispensed);
                                        }}>
                                            <button className={`w-4 h-4 rounded ${isDispensed ? 'bg-red-500' : 'bg-slate-200'}`} />
                                        </form>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}
