-- Makale kalite skoru (okunabilirlik + anahtar kelime yoğunluğu + SEO kontrolleri)
alter table articles add column if not exists quality_score jsonb;

-- Editöryal takvim: henüz üretilmemiş, planlanan makaleler
create table if not exists editorial_calendar (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  planned_date date not null,
  article_type text not null,
  audience text not null default 'genel',
  target_department_id uuid references departments(id) on delete set null,
  target_campus_id uuid references campuses(id) on delete set null,
  assigned_to text,
  notes text,
  status text not null default 'planned', -- planned, in_progress, done
  linked_article_id uuid references articles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_editorial_calendar_date on editorial_calendar(planned_date);
alter table public.editorial_calendar enable row level security;

-- Bildirim ayarları (Slack webhook), tek satır
create table if not exists notification_settings (
  id uuid primary key default gen_random_uuid(),
  slack_webhook_url text,
  notify_on_review boolean not null default true,
  notify_on_publish_failure boolean not null default true,
  notify_on_batch_complete boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
