"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

async function isChatEnabled() {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: 'CHAT_ENABLED' }
  });
  return setting ? setting.value === 'true' : true; // Activé par défaut
}

export async function getConversations() {
  if (!(await isChatEnabled())) throw new Error("Le chat est désactivé");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participant1Id: session.user.id },
        { participant2Id: session.user.id }
      ]
    },
    include: {
      participant1: { select: { id: true, firstName: true, lastName: true, role: true } },
      participant2: { select: { id: true, firstName: true, lastName: true, role: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return conversations.map(c => ({
    ...c,
    otherParticipant: c.participant1Id === session.user.id ? c.participant2 : c.participant1,
    lastMessage: c.messages[0]
  }));
}

export async function getMessages(conversationId: string) {
  if (!(await isChatEnabled())) throw new Error("Le chat est désactivé");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participant1Id: session.user.id }, { participant2Id: session.user.id }]
    }
  });
  if (!conversation) throw new Error("Conversation introuvable");

  return prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { firstName: true, lastName: true } } }
  });
}

export async function sendMessage(recipientId: string, content: string) {
  if (!(await isChatEnabled())) throw new Error("Le chat est désactivé");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");
  if (session.user.id === recipientId) throw new Error("Impossible de s'envoyer un message");

  const sender = await prisma.user.findUnique({ 
    where: { id: session.user.id },
    include: { students: true }
  });
  const recipient = await prisma.user.findUnique({ 
    where: { id: recipientId },
    include: { students: true }
  });

  if (!sender || !recipient) throw new Error("Utilisateur introuvable");

  // Logique de permission
  const isSenderAdmin = sender.role === 'SUPER_ADMIN' || sender.role === 'ADMIN';
  const isRecipientAdmin = recipient.role === 'SUPER_ADMIN' || recipient.role === 'ADMIN';

  // Admin peut contacter tout le monde
  if (isSenderAdmin || isRecipientAdmin) {
    // Ok
  } else if ((sender.role === 'STUDENT' || sender.role === 'RESPONSIBLE') && recipient.role === 'TEACHER') {
    // Vérifier si le prof enseigne à l'élève
    const studentId = sender.role === 'STUDENT' ? sender.id : (sender.students[0]?.id || "");
    
    // Vérifier si le prof a des leçons avec la classe de l'élève
    const hasRelationship = await prisma.lesson.findFirst({
        where: {
            teacherId: recipient.id,
            class: { students: { some: { id: studentId } } }
        }
    });

    if (!hasRelationship) {
        throw new Error("Vous ne pouvez contacter que vos professeurs.");
    }
  } else if (sender.role === 'TEACHER' && (recipient.role === 'STUDENT' || recipient.role === 'RESPONSIBLE')) {
      // Prof peut contacter ses élèves
      const studentId = recipient.role === 'STUDENT' ? recipient.id : (recipient.students[0]?.id || "");
      
      const hasRelationship = await prisma.lesson.findFirst({
        where: {
            teacherId: sender.id,
            class: { students: { some: { id: studentId } } }
        }
    });

    if (!hasRelationship) {
        throw new Error("Vous ne pouvez contacter que vos élèves.");
    }
  } else {
    throw new Error("Conversation non autorisée entre ces rôles.");
  }

  // Find or create conversation
  const conversation = await prisma.conversation.upsert({
    where: {
        participant1Id_participant2Id: {
            participant1Id: [session.user.id, recipientId].sort()[0],
            participant2Id: [session.user.id, recipientId].sort()[1]
        }
    },
    create: {
        participant1Id: [session.user.id, recipientId].sort()[0],
        participant2Id: [session.user.id, recipientId].sort()[1]
    },
    update: {}
  });

  const message = await prisma.chatMessage.create({
    data: {
      content,
      senderId: session.user.id,
      conversationId: conversation.id
    }
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  revalidatePath("/messages");
  return message;
}

export async function getAuthorizedContacts(search: string = "") {
  if (!(await isChatEnabled())) throw new Error("Le chat est désactivé");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const sender = await prisma.user.findUnique({ 
    where: { id: session.user.id },
    include: { students: true }
  });
  if (!sender) throw new Error("Utilisateur introuvable");

  let whereClause: any = {
      id: { not: session.user.id },
      OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
      ]
  };

  // Restreindre selon les permissions
  if (sender.role === 'STUDENT' || sender.role === 'RESPONSIBLE') {
      // Élèves/Parents -> uniquement leurs profs
      const studentId = sender.role === 'STUDENT' ? sender.id : (sender.students[0]?.id || "");
      const lessons = await prisma.lesson.findMany({
          where: { class: { students: { some: { id: studentId } } } },
          select: { teacherId: true }
      });
      const teacherIds = lessons.map(l => l.teacherId);
      whereClause.id = { in: teacherIds };
  } else if (sender.role === 'TEACHER') {
      // Profs -> uniquement leurs élèves/parents
      const lessons = await prisma.lesson.findMany({
          where: { teacherId: sender.id },
          select: { classId: true }
      });
      const classIds = lessons.map(l => l.classId);
      whereClause.OR = [
          { studentProfile: { classId: { in: classIds } } },
          { role: 'RESPONSIBLE', students: { some: { classId: { in: classIds } } } }
      ];
  } // Admins voient tout (par défaut, pas de filtre supplémentaire)

  return await prisma.user.findMany({
    where: whereClause,
    select: { id: true, firstName: true, lastName: true, role: true },
    take: 20
  });
}

export async function markAsRead(conversationId: string) {
  if (!(await isChatEnabled())) throw new Error("Le chat est désactivé");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.chatMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: session.user.id },
      isRead: false
    },
    data: { isRead: true }
  });
  revalidatePath("/messages");
}
