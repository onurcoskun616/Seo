import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";
import { PanelRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_ROLES: PanelRole[] = ["admin", "editor", "reviewer"];

export async function GET(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("panel_users")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const body = await req.json();
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Ad, e-posta ve şifre gerekli." }, { status: 400 });
    }
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Şifre en az 8 karakter olmalı." }, { status: 400 });
    }
    const role: PanelRole = VALID_ROLES.includes(body.role) ? body.role : "editor";
    const passwordHash = await bcrypt.hash(body.password, 10);

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("panel_users")
      .insert({
        name: body.name,
        email: String(body.email).toLowerCase().trim(),
        password_hash: passwordHash,
        role
      })
      .select("id, name, email, role, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
