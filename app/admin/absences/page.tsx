import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function AdminAbsencesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  // Récupérer les élèves avec leurs absences
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT"
    },
    include: {
      absences: {
        include: {
          lesson: {
            include: { subject: true }
          }
        }
      }
    }
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Gestion des absences</h1>
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 font-bold text-slate-500">Nom</th>
              <th className="py-3 font-bold text-slate-500">Nombre absences</th>
              <th className="py-3 font-bold text-slate-500">Détails</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="py-4 font-medium">{s.lastName} {s.firstName}</td>
                <td className="py-4">{s.absences.length}</td>
                <td className="py-4">
                  {/* Lien ou détail ici */}
                  <span className="text-blue-600">Voir détails</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
