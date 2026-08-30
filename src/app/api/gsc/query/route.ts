import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { isGscConfigured, queryGscSearchAnalytics } from "@/lib/gsc";

export const dynamic = "force-dynamic";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    if (!isGscConfigured()) {
      return NextResponse.json(
        { error: "Google Search Console yapılandırılmamış. Ayarlar sayfasına bakın." },
        { status: 400 }
      );
    }

    const days = Number(req.nextUrl.searchParams.get("days") || 28);
    const end = new Date();
    end.setDate(end.getDate() - 2); // GSC verisi genelde 1-2 gün gecikmeli gelir
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    const [queries, pages] = await Promise.all([
      queryGscSearchAnalytics({
        startDate: isoDate(start),
        endDate: isoDate(end),
        dimensions: ["query"],
        rowLimit: 25
      }),
      queryGscSearchAnalytics({
        startDate: isoDate(start),
        endDate: isoDate(end),
        dimensions: ["page"],
        rowLimit: 25
      })
    ]);

    return NextResponse.json({
      range: { start: isoDate(start), end: isoDate(end) },
      queries,
      pages
    });
  } catch (err) {
    return errorResponse(err);
  }
}
