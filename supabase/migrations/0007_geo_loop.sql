-- GEO döngüsü: Ölç -> Teşhis et -> Reçete yaz -> Yeniden ölç
alter table geo_visibility_results add column if not exists run_id uuid;
create index if not exists idx_geo_results_run on geo_visibility_results(run_id);

create table if not exists weekly_briefings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  share_of_voice_percent numeric,
  previous_share_of_voice_percent numeric,
  diagnostics_summary jsonb,
  message_text text,
  slack_sent boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.weekly_briefings enable row level security;
