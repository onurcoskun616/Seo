-- Maliyet takibi: her API çağrısının token kullanımını kaydeder.
-- Gerçek $ maliyeti hesaplamak için cost_rates'e kendi fiyatlarınızı
-- girmeniz gerekir (fiyatlar sık değiştiği için burada varsayılan/tahmini
-- bir değer YOKTUR, yanlış yönlendirmemek için).
create table if not exists api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'strategist' | 'content_expert' | 'editor' | 'geo_meta' | 'aeo_fix' | 'geo_test' | 'research' | ...
  provider text not null, -- 'openai' | 'gemini'
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  article_id uuid references articles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_api_usage_created on api_usage_logs(created_at desc);
create index if not exists idx_api_usage_provider_model on api_usage_logs(provider, model);
alter table public.api_usage_logs enable row level security;

create table if not exists cost_rates (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  input_price_per_million numeric not null default 0,
  output_price_per_million numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique(provider, model)
);
alter table public.cost_rates enable row level security;
