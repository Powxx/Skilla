import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import AdminIdeesClient, { AdminIdeaItem } from "./admin-idees-client";

export const metadata = {
  title: "Boîte à idées & Pannes — Administration",
  description: "Espace de suggestions et signalement de pannes avec notification directe à l'Administrateur Général",
};

export const dynamic = "force-dynamic";

export default async function AdminIdeesPage() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN" &&
      !(session.user as any).isGeneralAdmin)
  ) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isGeneralAdmin: true,
      firstName: true,
      lastName: true,
    },
  });

  const isGeneralAdmin = Boolean(
    currentUser?.isGeneralAdmin ||
    session.user.role === "SUPER_ADMIN" ||
    (session.user as any).isGeneralAdmin
  );

  const rawIdeas = (prisma as any).adminIdea?.findMany
    ? await (prisma as any).adminIdea.findMany({
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          votes: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const formattedIdeas: AdminIdeaItem[] = rawIdeas.map((idea: any) => {
    const hasVoted = (idea.votes || []).some((v: any) => v.userId === session.user.id);
    const authorName = idea.author
      ? `${idea.author.firstName || ""} ${idea.author.lastName || ""}`.trim() || "Administrateur"
      : "Administrateur";

    return {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      status: idea.status,
      adminResponse: idea.adminResponse,
      respondedAt: idea.respondedAt ? idea.respondedAt.toISOString() : null,
      authorId: idea.authorId,
      authorName,
      authorRole: idea.author?.role || "ADMIN",
      createdAt: idea.createdAt.toISOString(),
      updatedAt: idea.updatedAt.toISOString(),
      votesCount: idea.votes.length,
      hasVoted,
      isOwnIdea: idea.authorId === session.user.id,
    };
  });

  return (
    <AdminIdeesClient
      ideas={formattedIdeas}
      currentUserId={session.user.id}
      isGeneralAdmin={isGeneralAdmin}
    />
  );
}
