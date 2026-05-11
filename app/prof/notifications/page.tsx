import prisma from "@/lib/prisma";
import SendNotificationClient from "./notifications-client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function ProfNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TEACHER") redirect("/login");

  const classes = await prisma.class.findMany({ select: { id: true, name: true } });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Centre de notifications</h1>
      <SendNotificationClient classes={classes} />
    </div>
  );
}
