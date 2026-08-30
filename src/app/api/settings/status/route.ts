import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    siteUrl: process.env.SITE_URL || "https://www.topkapiokullari.com"
  });
}
