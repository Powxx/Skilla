import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AdminNotificationSender from "@/components/notifications/AdminNotificationSender";
import AdminNotificationsHistory, { 
  AdminNotificationRecord, 
  ClassLogRecord 
} from "@/components/notifications/AdminNotificationsHistory";
import { GraduationCap, Users, Bell, School } from "lucide-react";

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

  const [logs, classes, teachers, adminNotifsRaw] = await Promise.all([
    prisma.classNotificationLog.findMany({
      include: {
        sender: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 60
    }),
    prisma.class.findMany({ 
      orderBy: { name: "asc" }, 
      select: { id: true, name: true } 
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.notification.findMany({
      where: { senderName: "Administration" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    })
  ]);

  // Regroupement des notifications administratives diffusées en groupe
  const groupedMap = new Map<string, {
    key: string;
    ids: string[];
    title: string;
    message: string;
    type: string;
    createdAt: string;
    senderName: string;
    roles: Set<string>;
    users: { firstName: string | null; lastName: string | null; email: string | null; role: string }[];
  }>();

  for (const n of adminNotifsRaw) {
    const timeKey = n.createdAt.toISOString().slice(0, 16);
    const key = `${n.title}___${n.message}___${timeKey}`;

    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        key: n.id,
        ids: [n.id],
        title: n.title,
        message: n.message,
        type: n.type,
        createdAt: n.createdAt.toISOString(),
        senderName: n.senderName,
        roles: new Set([n.user.role]),
        users: [n.user]
      });
    } else {
      const existing = groupedMap.get(key)!;
      existing.ids.push(n.id);
      existing.roles.add(n.user.role);
      existing.users.push(n.user);
    }
  }

  const adminLogs: AdminNotificationRecord[] = Array.from(groupedMap.values()).map((g) => {
    const isTeacherOnly = g.roles.size === 1 && g.roles.has("TEACHER");
    const count = g.ids.length;

    let recipientLabel = "";
    let recipientType: AdminNotificationRecord["recipientType"] = "STUDENT_GROUP";

    if (isTeacherOnly) {
      if (count > 1) {
        recipientLabel = `Tous les professeurs (${count})`;
        recipientType = "TEACHER_GROUP";
      } else {
        const u = g.users[0];
        recipientLabel = `Prof. ${u?.lastName ?? ""} ${u?.firstName ?? ""}`.trim() || u?.email || "Enseignant";
        recipientType = "TEACHER_SINGLE";
      }
    } else {
      if (count > 1) {
        recipientLabel = `Tous les élèves (${count})`;
        recipientType = "STUDENT_GROUP";
      } else {
        const u = g.users[0];
        recipientLabel = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || u?.email || "Élève";
        recipientType = "STUDENT_SINGLE";
      }
    }

    return {
      key: g.key,
      ids: g.ids,
      title: g.title,
      message: g.message,
      type: g.type,
      createdAt: g.createdAt,
      senderName: g.senderName,
      recipientLabel,
      recipientCount: count,
      recipientType
    };
  });

  const classLogs: ClassLogRecord[] = logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    senderName: `${l.sender.lastName ?? ""} ${l.sender.firstName ?? ""}`.trim() || "Enseignant",
    className: l.class.name,
    title: l.title,
    message: l.message
  }));

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-indigo-600" />
            Module Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez et diffusez les communications vers les professeurs (groupé ou individuel) et les étudiants.
          </p>
        </div>

        {/* Indicateurs clés */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs font-bold">{teachers.length} professeurs</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-700">
            <School className="h-4 w-4" />
            <span className="text-xs font-bold">{classes.length} classes</span>
          </div>
        </div>
      </div>

      {/* Module d'envoi principal */}
      <AdminNotificationSender classes={classes} teachers={teachers} />

      {/* Historique complet des notifications */}
      <AdminNotificationsHistory 
        adminLogs={adminLogs} 
        classLogs={classLogs} 
        onDeleteClassLog={deleteLog}
      />
    </div>
  );
}
