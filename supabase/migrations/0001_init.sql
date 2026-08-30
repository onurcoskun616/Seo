-- Topkapı Okulları SEO/GEO içerik motoru - başlangıç şeması
create extension if not exists "pgcrypto";

-- Okulun kimliği/tanıtımı (tek satır beklenir, ama esneklik için tablo)
create table if not exists school_identity (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Topkapı Okulları',
  school_type text default 'Mesleki ve Teknik Anadolu Lisesi',
  short_description text,
  mission text,
  history text,
  accreditation text,
  website_url text default 'https://www.topkapiokullari.com',
  contact_phone text,
  contact_email text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  address text,
  facilities text[] not null default '{}',
  contact_phone text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  campus_ids uuid[] not null default '{}',
  description text,
  curriculum_highlights text[] not null default '{}',
  career_paths text[] not null default '{}',
  university_paths text[] not null default '{}',
  sample_employers text[] not null default '{}',
  success_stories text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  article_type text not null,
  target_department_id uuid references departments(id) on delete set null,
  target_campus_id uuid references campuses(id) on delete set null,
  audience text not null default 'genel',
  title text,
  slug text unique,
  meta_description text,
  content_markdown text,
  content_html text,
  faq_json jsonb,
  json_ld jsonb,
  ai_answer_snippet text,
  status text not null default 'draft',
  agent_trace jsonb,
  extra_instructions text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publish_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  endpoint_url text not null,
  http_method text not null default 'POST',
  auth_header_name text,
  auth_header_value text,
  field_mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publish_logs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  publish_config_id uuid references publish_configs(id) on delete set null,
  status text not null,
  status_code int,
  response_snippet text,
  created_at timestamptz not null default now()
);

create index if not exists idx_articles_status on articles(status);
create index if not exists idx_articles_department on articles(target_department_id);
create index if not exists idx_articles_campus on articles(target_campus_id);
create index if not exists idx_departments_slug on departments(slug);

insert into school_identity (name, school_type, website_url)
select 'Topkapı Okulları', 'Mesleki ve Teknik Anadolu Lisesi', 'https://www.topkapiokullari.com'
where not exists (select 1 from school_identity);
