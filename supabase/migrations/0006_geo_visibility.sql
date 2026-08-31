-- GEO Görünürlük Testi: gerçek arama-destekli AI yanıtlarında Topkapı
-- Okulları'nın geçip geçmediğini periyodik/manuel olarak izler.
create table if not exists geo_test_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.geo_test_prompts enable row level security;

create table if not exists geo_visibility_results (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references geo_test_prompts(id) on delete cascade,
  provider text not null, -- 'openai' | 'gemini'
  response_text text,
  mentioned boolean not null default false,
  mentioned_with_link boolean not null default false,
  error text,
  checked_at timestamptz not null default now()
);
create index if not exists idx_geo_results_prompt on geo_visibility_results(prompt_id, checked_at desc);
alter table public.geo_visibility_results enable row level security;

insert into geo_test_prompts (prompt)
select v.prompt from (values
  ('İstanbul''da iyi bir meslek lisesi önerir misin?'),
  ('Başakşehir / İkitelli bölgesinde meslek lisesi hangileri var?'),
  ('LGS sonrası meslek lisesi seçerken hangi okullara bakmalıyım?'),
  ('İstanbul''da CNC teknolojisi bölümü olan meslek liseleri hangileri?')
) as v(prompt)
where not exists (select 1 from geo_test_prompts);
