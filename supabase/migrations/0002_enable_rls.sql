-- Uygulama, Supabase'e yalnızca sunucu tarafında service_role anahtarıyla
-- erişir (RLS'i bypass eder); anon/publishable anahtar hiçbir yerde
-- kullanılmaz. Yine de savunma amaçlı olarak tüm tablolarda RLS'i açıp
-- anon/authenticated rollerine hiçbir politika tanımlamıyoruz (erişim sıfır).
alter table public.school_identity enable row level security;
alter table public.campuses enable row level security;
alter table public.departments enable row level security;
alter table public.articles enable row level security;
alter table public.publish_configs enable row level security;
alter table public.publish_logs enable row level security;
