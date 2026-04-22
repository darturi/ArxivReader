-- ============================================
-- ArXiv Reader — Initial Schema
-- ============================================

-- 1. users (extends Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user row on first sign-in
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. paper_cache (shared across all users)
create type paper_source as enum ('arxiv');

create table if not exists public.paper_cache (
  arxiv_id text primary key,
  title text not null,
  authors jsonb not null default '[]',
  abstract text,
  arxiv_url text,
  published_at timestamptz,
  cached_at timestamptz not null default now(),
  source paper_source not null default 'arxiv'
);

alter table public.paper_cache enable row level security;

-- Anyone authenticated can read cached papers
create policy "Authenticated users can read paper cache"
  on public.paper_cache for select
  to authenticated
  using (true);

-- Server (service role) inserts; authenticated users can also insert via API
create policy "Authenticated users can insert paper cache"
  on public.paper_cache for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update paper cache"
  on public.paper_cache for update
  to authenticated
  using (true);

create index idx_paper_cache_cached_at on public.paper_cache (cached_at);

-- 3. user_papers (join between user and paper)
create type reading_list as enum ('read', 'to_read');

create table if not exists public.user_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  arxiv_id text not null references public.paper_cache(arxiv_id) on delete cascade,
  list reading_list not null default 'to_read',
  added_at timestamptz not null default now(),
  notes text,
  constraint unique_user_paper unique (user_id, arxiv_id)
);

alter table public.user_papers enable row level security;

create policy "Users can read own papers"
  on public.user_papers for select
  using (auth.uid() = user_id);

create policy "Users can insert own papers"
  on public.user_papers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own papers"
  on public.user_papers for update
  using (auth.uid() = user_id);

create policy "Users can delete own papers"
  on public.user_papers for delete
  using (auth.uid() = user_id);

create index idx_user_papers_user_list on public.user_papers (user_id, list);

-- 4. tags (user-owned)
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint unique_user_tag unique (user_id, name)
);

alter table public.tags enable row level security;

create policy "Users can read own tags"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- 5. paper_tags (join between user_papers and tags)
create table if not exists public.paper_tags (
  user_paper_id uuid not null references public.user_papers(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (user_paper_id, tag_id)
);

alter table public.paper_tags enable row level security;

create policy "Users can read own paper tags"
  on public.paper_tags for select
  using (
    exists (
      select 1 from public.user_papers
      where user_papers.id = paper_tags.user_paper_id
      and user_papers.user_id = auth.uid()
    )
  );

create policy "Users can insert own paper tags"
  on public.paper_tags for insert
  with check (
    exists (
      select 1 from public.user_papers
      where user_papers.id = paper_tags.user_paper_id
      and user_papers.user_id = auth.uid()
    )
  );

create policy "Users can delete own paper tags"
  on public.paper_tags for delete
  using (
    exists (
      select 1 from public.user_papers
      where user_papers.id = paper_tags.user_paper_id
      and user_papers.user_id = auth.uid()
    )
  );

-- 6. rate_limit_log
create table if not exists public.rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null default 'search',
  created_at timestamptz not null default now()
);

alter table public.rate_limit_log enable row level security;

create policy "Users can read own rate limit log"
  on public.rate_limit_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own rate limit log"
  on public.rate_limit_log for insert
  with check (auth.uid() = user_id);

create index idx_rate_limit_user_action on public.rate_limit_log (user_id, action, created_at);
