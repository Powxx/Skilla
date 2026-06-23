import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MeetingsReminderClient from "./meetings-reminder-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mes Rendez-vous",
  description: "Consulter vos rendez-vous planifiés avec l'administration.",
};

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const allowed = ["STUDENT", "RESPONSIBLE", "COMPANY_TUTOR", "PARENT"];
  if (!allowed.includes(String(session.user.role))) {
    redirect("/");
  }

  const meetings = await prisma.meetingRequest.findMany({
    where: { senderId: session.user.id },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <MeetingsReminderClient
      meetings={meetings.map((m) => ({
        id: m.id,
        reason: m.reason,
        status: m.status,
        requestedAt: m.requestedAt.toISOString(),
        scheduledAt: m.scheduledAt?.toISOString() ?? null,
        adminNotes: m.adminNotes ?? null,
      }))}
    />
  );
}
