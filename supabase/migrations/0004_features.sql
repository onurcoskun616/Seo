-- Toplu üretim işleri
create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  article_type text not null,
  audience text not null default 'genel',
  target_type text not null, -- 'department' | 'campus' | 'none'
  target_ids uuid[] not null default '{}',
  total int not null default 0,
  status text not null default 'pending', -- pending, running, done, error
  created_article_ids uuid[] not null default '{}',
  failed_targets jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.generation_jobs enable row level security;

-- GEO ajanının ürettiği görsel/alt metin önerileri
alter table articles add column if not exists image_suggestions jsonb;

-- Panel kullanıcıları (rol bazlı onay/inceleme akışı için)
create table if not exists panel_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'editor', -- admin, editor, reviewer
  created_at timestamptz not null default now()
);
alter table public.panel_users enable row level security;

-- Makale versiyon geçmişi (her güncellemeden önceki hâlin anlık görüntüsü)
create table if not exists article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  title text,
  meta_description text,
  content_markdown text,
  status text,
  edited_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_article_revisions_article on article_revisions(article_id);
alter table public.article_revisions enable row level security;
