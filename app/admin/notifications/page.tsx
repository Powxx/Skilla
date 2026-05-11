import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { revalidatePath } from "next/cache";

async function deleteLog(id: string) {
  "use server";
  await prisma.classNotificationLog.delete({ where: { id } });
  revalidatePath("/admin/notifications");
}

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const logs = await prisma.classNotificationLog.findMany({
    include: {
        sender: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Notifications envoyées aux classes</h1>
      <div className="bg-white rounded-xl border shadow-sm p-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 font-bold text-slate-500">Date</th>
              <th className="py-3 font-bold text-slate-500">Émetteur</th>
              <th className="py-3 font-bold text-slate-500">Classe</th>
              <th className="py-3 font-bold text-slate-500">Titre</th>
              <th className="py-3 font-bold text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 last:border-0">
                <td className="py-4 whitespace-nowrap text-slate-500">{format(log.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}</td>
                <td className="py-4 font-medium">{log.sender.lastName} {log.sender.firstName}</td>
                <td className="py-4">{log.class.name}</td>
                <td className="py-4 font-semibold">{log.title}</td>
                <td className="py-4">
                    <form action={deleteLog.bind(null, log.id)}>
                        <button type="submit" className="text-red-600 hover:text-red-800 font-bold underline text-xs">Supprimer</button>
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
