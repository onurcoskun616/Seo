-- Öğrenci başarıları / projeler / sportif başarılar için onaylı veri kaynağı.
-- "Öğrenci Başarıları" makale türü YALNIZCA buradaki kayıtlara dayanarak
-- yazılır; boşsa ajan uydurma başarı üretmez (API katmanında engellenir).
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'diger', -- sportif, proje, akademik, yarisma, diger
  description text,
  achievement_date date,
  department_id uuid references departments(id) on delete set null,
  campus_id uuid references campuses(id) on delete set null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_achievements_category on achievements(category);

alter table public.achievements enable row level security;
