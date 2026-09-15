"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

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

export async function getChatRetentionDays() {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: 'CHAT_RETENTION_DAYS' }
  });
  return setting ? parseInt(setting.value, 10) : 7; // 7 jours par défaut
}

async function cleanupOldMessages() {
  const days = await getRetentionDays();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);
  
  await prisma.chatMessage.deleteMany({
    where: {
      createdAt: { lt: thresholdDate }
    }
  });
}

export async function getMessages(conversationId: string, page: number = 1, pageSize: number = 50) {
  if (!(await isChatEnabled())) throw new Error("Le chat est désactivé");
  
  // Appliquer la rétention avant de récupérer
  await cleanupOldMessages();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé");

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participant1Id: session.user.id }, { participant2Id: session.user.id }]
    }
  });
  if (!conversation) throw new Error("Conversation introuvable");

  const days = await getRetentionDays();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);

  return prisma.chatMessage.findMany({
    where: { 
        conversationId,
        createdAt: { gte: thresholdDate }
    },
    orderBy: { createdAt: 'desc' }, // Inversé pour le 'take' logique (les plus récents)
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { sender: { select: { firstName: true, lastName: true } } }
  }).then(messages => messages.reverse()); // Remettre dans l'ordre chronologique
}

function isGeneralAdminUser(u: { email?: string | null; username?: string | null; firstName?: string | null; lastName?: string | null; isGeneralAdmin?: boolean | null }): boolean {
  if (u.isGeneralAdmin) return true;
  if (u.email?.toLowerCase() === "admin@skilla.edu") return true;
  if (u.username?.toLowerCase() === "admin") return true;
  if (u.firstName?.toLowerCase() === "admin" && (u.lastName?.toLowerCase() === "general" || u.lastName?.toLowerCase() === "général" || u.lastName?.toLowerCase() === "skilla")) return true;
  return false;
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
  const recipientIsGeneralAdmin = isGeneralAdminUser(recipient);

  // L'administrateur général ne peut pas être contacté directement par les autres utilisateurs
  if (isRecipientAdmin && recipientIsGeneralAdmin && !isGeneralAdminUser(sender)) {
    throw new Error("L'administrateur général ne peut pas être contacté directement.");
  }

  // Un administrateur ou tout utilisateur contactant un administrateur (non général) est autorisé
  if (isSenderAdmin || (isRecipientAdmin && !recipientIsGeneralAdmin)) {
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

  await createNotification({
      userId: recipientId,
      title: "Nouveau message",
      message: content.length > 50 ? content.substring(0, 50) + "..." : content,
      type: "INFO",
      link: "/messages"
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

  // Récupérer les admins & super admins contactables (exclut l'administrateur général)
  const contactableAdminsRaw = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      isActive: true,
      NOT: [
        { email: { equals: "admin@skilla.edu", mode: 'insensitive' } },
        { username: { equals: "admin", mode: 'insensitive' } },
        { isGeneralAdmin: true }
      ]
    },
    select: { id: true, firstName: true, lastName: true, username: true, email: true, isGeneralAdmin: true }
  });

  const adminIds = contactableAdminsRaw
    .filter(a => !isGeneralAdminUser(a))
    .map(a => a.id);

  let allowedUserIds: string[] = [...adminIds];

  // Restreindre selon les rôles
  if (sender.role === 'STUDENT' || sender.role === 'RESPONSIBLE') {
      // Élèves/Parents -> leurs profs + admins
      const studentId = sender.role === 'STUDENT' ? sender.id : (sender.students[0]?.id || "");
      const lessons = await prisma.lesson.findMany({
          where: { class: { students: { some: { id: studentId } } } },
          select: { teacherId: true }
      });
      const teacherIds = lessons.map(l => l.teacherId);
      allowedUserIds = Array.from(new Set([...allowedUserIds, ...teacherIds]));
  } else if (sender.role === 'TEACHER') {
      // Profs -> leurs élèves/parents + admins
      const lessons = await prisma.lesson.findMany({
          where: { teacherId: sender.id },
          select: { classId: true }
      });
      const classIds = lessons.map(l => l.classId);
      const studentsAndParents = await prisma.user.findMany({
          where: {
              OR: [
                  { studentProfile: { classId: { in: classIds } } },
                  { role: 'RESPONSIBLE', students: { some: { classId: { in: classIds } } } }
              ]
          },
          select: { id: true }
      });
      allowedUserIds = Array.from(new Set([...allowedUserIds, ...studentsAndParents.map(u => u.id)]));
  } else if (sender.role === 'COMPANY_TUTOR') {
      // Tuteurs entreprise -> leurs alternants + admins
      const contracts = await prisma.companyContract.findMany({
          where: { tutorId: sender.id },
          select: { studentId: true }
      });
      const studentIds = contracts.map(c => c.studentId);
      allowedUserIds = Array.from(new Set([...allowedUserIds, ...studentIds]));
  } else {
      // Admins & Super Admins -> voient tous les utilisateurs actifs
      const allUsers = await prisma.user.findMany({
        where: {
            id: { not: session.user.id },
            isActive: true,
            OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ]
        },
        select: { id: true, firstName: true, lastName: true, role: true },
        take: 30
      });
      return allUsers;
  }

  return await prisma.user.findMany({
    where: {
      id: { in: allowedUserIds, not: session.user.id },
      isActive: true,
      OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
      ]
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    take: 30
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
