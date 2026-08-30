import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    siteUrl: process.env.SITE_URL || "https://www.topkapiokullari.com"
  });
}
