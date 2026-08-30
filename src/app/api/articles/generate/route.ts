import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { checkGenerationBlocked, createArticleRecord } from "@/lib/agents/createArticle";
import { VALID_ARTICLE_TYPES, VALID_AUDIENCES } from "@/lib/agents/constants";
import { GenerateArticleInput } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!VALID_ARTICLE_TYPES.includes(body.articleType)) {
      return NextResponse.json({ error: "Geçersiz makale türü." }, { status: 400 });
    }
    if (!VALID_AUDIENCES.includes(body.audience)) {
      return NextResponse.json({ error: "Geçersiz hedef kitle." }, { status: 400 });
    }

    const input: GenerateArticleInput = {
      articleType: body.articleType,
      audience: body.audience,
      departmentId: body.departmentId || null,
      campusId: body.campusId || null,
      extraInstructions: body.extraInstructions || undefined
    };

    const blockedReason = await checkGenerationBlocked(input.articleType);
    if (blockedReason) {
      return NextResponse.json({ error: blockedReason }, { status: 400 });
    }

    const article = await createArticleRecord(input);
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
