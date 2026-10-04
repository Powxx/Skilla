import { NextResponse } from "next/server";
import { processDueScheduledNotifications } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const result = await processDueScheduledNotifications();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
