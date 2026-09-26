"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { SatisfactionSurveyTarget } from "@prisma/client";
import { sendPushNotification } from "./push";
import { isQualiopiEnabled, surveyLinkForRole } from "@/lib/qualiopi";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    throw new Error("Non autorisé.");
  }
  return session;
}

async function assertQualiopiEnabled() {
  const enabled = await isQualiopiEnabled();
  if (!enabled) throw new Error("Le module Qualiopi est désactivé.");
}

const TARGET_ROLES: Record<SatisfactionSurveyTarget, string | null> = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  RESPONSIBLE: "RESPONSIBLE",
  COMPANY_TUTOR: "COMPANY_TUTOR",
  CLASS: "STUDENT",
};

async function resolveCampaignRecipients(
  targetType: SatisfactionSurveyTarget,
  classId?: string | null,
) {
  if (targetType === "CLASS") {
    if (!classId) throw new Error("Veuillez sélectionner une classe.");
    return prisma.user.findMany({
      where: { role: "STUDENT", isActive: true, classId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  const role = TARGET_ROLES[targetType];
  if (!role) return [];

  return prisma.user.findMany({
    where: { role: role as "STUDENT" | "TEACHER" | "RESPONSIBLE" | "COMPANY_TUTOR", isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });
}

function userMatchesCampaign(
  user: { id: string; role: string; classId: string | null },
  targetType: SatisfactionSurveyTarget,
  classId: string | null,
): boolean {
  if (targetType === "CLASS") {
    return user.role === "STUDENT" && user.classId === classId;
  }
  return user.role === TARGET_ROLES[targetType];
}

export async function getQualiopiData() {
  await assertAdmin();
  await assertQualiopiEnabled();

  const [complaints, surveys, campaigns, classes] = await Promise.all([
    prisma.complaint.findMany({
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.satisfactionSurvey.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
            class: { select: { name: true } },
          },
        },
        campaign: { select: { title: true, targetType: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.satisfactionSurveyCampaign.findMany({
      include: {
        class: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return { complaints, surveys, campaigns, classes };
}

export async function createSurveyCampaign(data: {
  title: string;
  description?: string;
  targetType: SatisfactionSurveyTarget;
  classId?: string;
}) {
  const session = await assertAdmin();
  await assertQualiopiEnabled();

  const title = data.title.trim();
  if (!title) throw new Error("Le titre est obligatoire.");

  const targetType = data.targetType;
  const classId = targetType === "CLASS" ? data.classId : null;

  const recipients = await resolveCampaignRecipients(targetType, classId);
  if (recipients.length === 0) throw new Error("Aucun destinataire trouvé pour cette cible.");

  const campaign = await prisma.satisfactionSurveyCampaign.create({
    data: {
      title,
      description: data.description?.trim() || null,
      targetType,
      classId: classId ?? null,
      createdById: session.user.id,
    },
  });

  const link = surveyLinkForRole(campaign.id);
  const notifTitle = "📋 Enquête de satisfaction";
  const notifBody = `L'établissement vous invite à répondre : « ${title} »`;

  // Insertion groupée rapide en une seule requête SQL
  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      title: notifTitle,
      message: notifBody,
      type: "INFO",
      link,
      senderName: "Qualiopi",
    })),
  });

  // Envoi Web Push asynchrone parallélisé
  Promise.allSettled(
    recipients.map((user) =>
      sendPushNotification(user.id, { title: notifTitle, body: notifBody, url: link })
    )
  ).catch((err) => console.error("[createSurveyCampaign] Push notifications error:", err));

  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true, campaign, recipientCount: recipients.length };
}

export async function toggleSurveyCampaign(id: string, isActive: boolean) {
  await assertAdmin();
  await assertQualiopiEnabled();

  await prisma.satisfactionSurveyCampaign.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function deleteSurveyCampaign(id: string) {
  await assertAdmin();
  await assertQualiopiEnabled();

  await prisma.satisfactionSurveyCampaign.delete({ where: { id } });
  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function getSurveyCampaignForUser(campaignId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé.");

  const enabled = await isQualiopiEnabled();
  if (!enabled) throw new Error("Le module Qualiopi est désactivé.");

  const [campaign, user, existing] = await Promise.all([
    prisma.satisfactionSurveyCampaign.findUnique({
      where: { id: campaignId },
      include: { class: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, classId: true },
    }),
    prisma.satisfactionSurvey.findUnique({
      where: { userId_campaignId: { userId: session.user.id, campaignId } },
    }),
  ]);

  if (!campaign || !campaign.isActive) throw new Error("Enquête introuvable ou inactive.");
  if (!user || !userMatchesCampaign(user, campaign.targetType, campaign.classId)) {
    throw new Error("Vous n'êtes pas concerné par cette enquête.");
  }

  return { campaign, alreadySubmitted: !!existing };
}

export async function submitSurveyResponse(campaignId: string, rating: number, comment?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé.");

  await assertQualiopiEnabled();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("La note doit être entre 1 et 5.");
  }

  const { campaign, alreadySubmitted } = await getSurveyCampaignForUser(campaignId);
  if (alreadySubmitted) throw new Error("Vous avez déjà répondu à cette enquête.");

  await prisma.satisfactionSurvey.create({
    data: {
      userId: session.user.id,
      campaignId: campaign.id,
      rating,
      comment: comment?.trim() || null,
    },
  });

  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/survey/${campaignId}`);
  return { ok: true };
}

export async function updateComplaintStatus(id: string, status: string) {
  await assertAdmin();
  await assertQualiopiEnabled();

  const allowed = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!allowed.includes(status)) throw new Error("Statut invalide.");

  await prisma.complaint.update({ where: { id }, data: { status } });

  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function deleteComplaint(id: string) {
  await assertAdmin();
  await assertQualiopiEnabled();
  await prisma.complaint.delete({ where: { id } });
  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function deleteSatisfactionSurvey(id: string) {
  await assertAdmin();
  await assertQualiopiEnabled();
  await prisma.satisfactionSurvey.delete({ where: { id } });
  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function submitComplaint(data: {
  subject: string;
  description: string;
  category?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Vous devez être connecté pour déposer une réclamation.");

  const enabled = await isQualiopiEnabled();
  if (!enabled) {
    throw new Error("Le module Qualiopi / Réclamations est actuellement désactivé par l'établissement.");
  }

  const subject = data.subject.trim();
  const description = data.description.trim();

  if (!subject) throw new Error("Veuillez renseigner un objet pour votre réclamation.");
  if (!description) throw new Error("Veuillez détailler le motif de votre réclamation.");

  const formattedSubject = data.category ? `[${data.category}] ${subject}` : subject;

  const complaint = await prisma.complaint.create({
    data: {
      subject: formattedSubject,
      description,
      status: "OPEN",
      senderId: session.user.id,
    },
    include: {
      sender: {
        select: { firstName: true, lastName: true, role: true },
      },
    },
  });

  // Notifier les administrateurs de la réception de la réclamation (Engagement Qualiopi)
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      const senderName = `${complaint.sender.firstName ?? ""} ${complaint.sender.lastName ?? ""}`.trim() || "Un usager";
      const notifTitle = "⚠️ Nouvelle réclamation Qualiopi";
      const notifBody = `${senderName} : « ${subject} »`;
      const notifLink = "/admin/qualiopi";

      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: notifTitle,
          message: notifBody,
          type: "WARNING",
          link: notifLink,
          senderName: "Qualité / RNQ",
        })),
      });

      Promise.allSettled(
        admins.map((admin) =>
          sendPushNotification(admin.id, { title: notifTitle, body: notifBody, url: notifLink })
        )
      ).catch((e) => console.error("[submitComplaint] Push admin error:", e));
    }
  } catch (err) {
    console.error("[submitComplaint] Error notifying admins:", err);
  }

  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  revalidatePath("/reclamation");

  return { ok: true, complaintId: complaint.id };
}

export async function getUserComplaints() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autorisé.");

  const enabled = await isQualiopiEnabled();
  if (!enabled) return [];

  const complaints = await prisma.complaint.findMany({
    where: { senderId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  return complaints;
}

export async function recordCorrectiveAction(data: {
  complaintId: string;
  actionNote: string;
  status?: string;
}) {
  await assertAdmin();
  await assertQualiopiEnabled();

  const complaint = await prisma.complaint.findUnique({
    where: { id: data.complaintId },
    include: { sender: { select: { id: true, firstName: true } } },
  });

  if (!complaint) throw new Error("Réclamation introuvable.");

  const dateStr = new Date().toLocaleDateString("fr-FR");
  const actionAppended = `${complaint.description}\n\n--- [ACTION CORRECTIVE QUALIOPI — ${dateStr}] ---\n${data.actionNote.trim()}`;

  const updatedStatus = data.status || "RESOLVED";

  await prisma.complaint.update({
    where: { id: data.complaintId },
    data: {
      description: actionAppended,
      status: updatedStatus,
    },
  });

  // Notifier l'usager de la prise en charge ou résolution
  try {
    const notifTitle = "✅ Mise à jour de votre réclamation";
    const notifBody = `Une réponse ou mesure corrective a été enregistrée pour votre réclamation : « ${complaint.subject} ».`;
    const notifLink = "/reclamation";

    await prisma.notification.create({
      data: {
        userId: complaint.sender.id,
        title: notifTitle,
        message: notifBody,
        type: "SUCCESS",
        link: notifLink,
        senderName: "Cellule Qualité",
      },
    });

    sendPushNotification(complaint.sender.id, {
      title: notifTitle,
      body: notifBody,
      url: notifLink,
    }).catch((e) => console.error("Push error:", e));
  } catch (err) {
    console.error("Error notifying user on complaint resolution:", err);
  }

  revalidatePath("/admin/qualiopi");
  revalidatePath("/admin/dashboard");
  revalidatePath("/reclamation");

  return { ok: true };
}

export { isQualiopiEnabled };

