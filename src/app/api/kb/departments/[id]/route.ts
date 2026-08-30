import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { slugify } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("departments")
      .update({
        name: body.name,
        slug: body.slug ? slugify(body.slug) : slugify(body.name || ""),
        campus_ids: body.campus_ids ?? [],
        description: body.description ?? null,
        curriculum_highlights: body.curriculum_highlights ?? [],
        career_paths: body.career_paths ?? [],
        university_paths: body.university_paths ?? [],
        sample_employers: body.sample_employers ?? [],
        success_stories: body.success_stories ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ department: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("departments").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
