-- ============================================
-- ArXiv Reader — Security Hardening
-- Quotas, rate-limit cleanup, paper_cache lockdown
-- ============================================

-- 1. Lock down paper_cache: only service role can insert/update
--    (the Next.js API uses service role via server client)
--    Authenticated users can still READ.

drop policy if exists "Authenticated users can insert paper cache" on public.paper_cache;
drop policy if exists "Authenticated users can update paper cache" on public.paper_cache;

-- 2. Per-user quotas on user_papers (max 500 papers per user)

create or replace function public.check_user_papers_quota()
returns trigger as $$
declare
  paper_count int;
begin
  select count(*) into paper_count
  from public.user_papers
  where user_id = new.user_id;

  if paper_count >= 500 then
    raise exception 'Paper limit reached (max 500). Remove some papers before adding new ones.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_user_papers_quota on public.user_papers;
create trigger enforce_user_papers_quota
  before insert on public.user_papers
  for each row execute function public.check_user_papers_quota();

-- 3. Per-user quotas on tags (max 100 tags per user)

create or replace function public.check_user_tags_quota()
returns trigger as $$
declare
  tag_count int;
begin
  select count(*) into tag_count
  from public.tags
  where user_id = new.user_id;

  if tag_count >= 100 then
    raise exception 'Tag limit reached (max 100). Delete some tags before creating new ones.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_user_tags_quota on public.tags;
create trigger enforce_user_tags_quota
  before insert on public.tags
  for each row execute function public.check_user_tags_quota();

-- 4. Cleanup function for rate_limit_log (delete entries older than 24 hours)
--    Call this periodically via Supabase Edge Function, cron, or pg_cron.

create or replace function public.cleanup_rate_limit_log()
returns void as $$
begin
  delete from public.rate_limit_log
  where created_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;

-- 5. Cleanup function for stale paper_cache entries (older than 7 days, not referenced)
--    Prevents unbounded cache growth.

create or replace function public.cleanup_stale_paper_cache()
returns void as $$
begin
  delete from public.paper_cache
  where cached_at < now() - interval '7 days'
  and arxiv_id not in (
    select distinct arxiv_id from public.user_papers
  );
end;
$$ language plpgsql security definer;

-- 6. If pg_cron is available (Supabase Pro), schedule automatic cleanup.
--    On the free tier, these will need to be called manually or via an Edge Function.
--    Uncomment the lines below if you have pg_cron enabled:

-- select cron.schedule('cleanup-rate-limit-log', '0 * * * *', 'select public.cleanup_rate_limit_log()');
-- select cron.schedule('cleanup-stale-cache', '0 3 * * *', 'select public.cleanup_stale_paper_cache()');
