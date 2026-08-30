import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, PanelRole, SessionPayload } from "./auth";

/**
 * Belirli rollere sahip bir oturum ister. Uygun değilse hazır bir
 * NextResponse (401/403) döndürür, uygunsa session'ı döndürür.
 *
 * Kullanım:
 *   const check = await requireRole(req, ["admin"]);
 *   if ("error" in check) return check.error;
 *   const { session } = check;
 */
export async function requireRole(
  req: NextRequest,
  roles: PanelRole[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return { error: NextResponse.json({ error: "Giriş gerekli." }, { status: 401 }) };
  }
  if (!roles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }) };
  }
  return { session };
}
