import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSurveyCampaignForUser } from "@/app/actions/qualiopi";
import { isQualiopiEnabled } from "@/lib/qualiopi";
import SurveyFormClient from "@/components/qualiopi/survey-form-client";

export const dynamic = "force-dynamic";

function dashboardHrefForRole(role: string): string {
  if (role === "STUDENT") return "/student/dashboard";
  if (role === "TEACHER") return "/prof";
  if (role === "RESPONSIBLE") return "/parent/dashboard";
  if (role === "COMPANY_TUTOR") return "/employer/dashboard";
  return "/";
}

export default async function SurveyPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const enabled = await isQualiopiEnabled();
  if (!enabled) redirect(dashboardHrefForRole(session.user.role));

  const { campaignId } = await params;

  try {
    const { campaign, alreadySubmitted } = await getSurveyCampaignForUser(campaignId);

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <SurveyFormClient
            campaignId={campaign.id}
            title={campaign.title}
            description={campaign.description}
            targetType={campaign.targetType}
            className={campaign.class?.name ?? null}
            alreadySubmitted={alreadySubmitted}
            dashboardHref={dashboardHrefForRole(session.user.role)}
          />
        </div>
      </div>
    );
  } catch {
    redirect(dashboardHrefForRole(session.user.role));
  }
}
