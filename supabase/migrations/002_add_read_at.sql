-- Add optional read_at date to user_papers
alter table public.user_papers
  add column if not exists read_at date;
