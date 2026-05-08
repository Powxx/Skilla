import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { subMonths } from "date-fns";

/**
 * Route pour le Cron Job (ex: Vercel Cron)
 * Supprime les notifications de plus d'un mois.
 * Sécurisé par une clé API secrète.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // Vérification de la clé secrète CRON (à définir dans .env)
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  const oneMonthAgo = subMonths(new Date(), 1);

  try {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: oneMonthAgo,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Nettoyage automatique réussi : ${result.count} notifications supprimées.`,
      date: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
