-- Execute no SQL Editor do Supabase.
create table if not exists public.games (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 slug text not null unique,
 category text,
 short_description text,
 description text,
 cover_url text,
 status text not null default 'desenvolvimento' check (status in ('disponivel','desenvolvimento','breve')),
 status_label text,
 initials text,
 version text,
 action_label text,
 action_url text,
 body_html text,
 featured boolean not null default false,
 published boolean not null default false,
 sort_order integer not null default 100,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.games enable row level security;
-- Leitura pública somente dos itens publicados.
create policy "Public can read published games" on public.games for select to anon, authenticated using (published = true);
-- Allowlist de administradores: depois de criar seu usuário em Authentication > Users,
-- copie o UUID dele e execute o INSERT indicado no README.
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create policy "Admins can read own allowlist entry" on public.admin_users for select to authenticated using (auth.uid() = user_id);
create policy "Only allowlisted admins can manage games" on public.games for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
insert into public.games (title,slug,category,short_description,description,status,status_label,initials,featured,published,sort_order)
values
('GridLife','gridlife','SIMULAÇÃO · MOTORSPORT','Domine as pistas neste simulador e gerenciador de carreira motorsport.','A experiência de automobilismo da Elefante Triste Studio. Acompanhe o desenvolvimento do projeto e suas próximas novidades.','desenvolvimento','EM DESENVOLVIMENTO','GL',true,true,1),
('Shift’s Over','shifts-over','SIMULAÇÃO · GESTÃO','Você é capaz de gerenciar um estabelecimento sozinho ou com amigos?','Um projeto de simulação e gestão em desenvolvimento. Mais informações serão publicadas em breve.','desenvolvimento','EM DESENVOLVIMENTO','SO',true,true,2)
on conflict (slug) do nothing;
