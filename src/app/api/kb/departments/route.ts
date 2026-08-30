import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { slugify } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (error) throw error;
    return NextResponse.json({ departments: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("departments")
      .insert({
        name: body.name,
        slug: body.slug ? slugify(body.slug) : slugify(body.name || ""),
        campus_ids: body.campus_ids ?? [],
        description: body.description ?? null,
        curriculum_highlights: body.curriculum_highlights ?? [],
        career_paths: body.career_paths ?? [],
        university_paths: body.university_paths ?? [],
        sample_employers: body.sample_employers ?? [],
        success_stories: body.success_stories ?? null
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ department: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
