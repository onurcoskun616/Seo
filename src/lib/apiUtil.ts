import { NextResponse } from "next/server";

export function errorResponse(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : "Bilinmeyen hata";
  console.error(err);
  return NextResponse.json({ error: message }, { status });
}
