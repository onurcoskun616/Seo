import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { GeoProvider, isGeminiGeoConfigured, isOpenAiGeoConfigured, runGeoCheck } from "@/lib/geoTest";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const providers: GeoProvider[] = [];
    if (isOpenAiGeoConfigured()) providers.push("openai");
    if (isGeminiGeoConfigured()) providers.push("gemini");

    if (!providers.length) {
      return NextResponse.json(
        { error: "Hiçbir sağlayıcı yapılandırılmamış (OPENAI_API_KEY / GEMINI_API_KEY)." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { data: prompts, error: promptsErr } = await supabase
      .from("geo_test_prompts")
      .select("*")
      .eq("active", true);
    if (promptsErr) throw promptsErr;

    if (!prompts?.length) {
      return NextResponse.json({ error: "Aktif test sorusu yok." }, { status: 400 });
    }

    const results = [];
    for (const prompt of prompts) {
      for (const provider of providers) {
        const check = await runGeoCheck(provider, prompt.prompt);
        const { data: saved, error: saveErr } = await supabase
          .from("geo_visibility_results")
          .insert({
            prompt_id: prompt.id,
            provider,
            response_text: check.responseText,
            mentioned: check.mentioned,
            mentioned_with_link: check.mentionedWithLink,
            error: check.error || null
          })
          .select()
          .single();
        if (saveErr) throw saveErr;
        results.push(saved);
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return errorResponse(err);
  }
}
