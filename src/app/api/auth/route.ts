import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE_NAME, createSessionToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  let payload: { sub: string; role: "admin" | "editor" | "reviewer"; name: string } | null = null;

  if (typeof body?.email === "string" && typeof body?.password === "string") {
    // Bireysel kullanıcı girişi
    const supabase = getSupabaseServer();
    const { data: user } = await supabase
      .from("panel_users")
      .select("*")
      .eq("email", body.email.toLowerCase().trim())
      .maybeSingle();

    if (user && (await bcrypt.compare(body.password, user.password_hash))) {
      payload = { sub: user.id, role: user.role, name: user.name };
    }
  } else if (typeof body?.password === "string") {
    // Geriye dönük uyumluluk: paylaşımlı APP_PASSWORD, sanal "yönetici" oturumu açar
    const expected = process.env.APP_PASSWORD;
    if (expected && body.password === expected) {
      payload = { sub: "app_password", role: "admin", name: "Yönetici" };
    }
  }

  if (!payload) {
    return NextResponse.json({ error: "E-posta/şifre hatalı." }, { status: 401 });
  }

  const token = await createSessionToken(payload);
  const res = NextResponse.json({ ok: true, user: { name: payload.name, role: payload.role } });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
