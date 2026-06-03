create table if not exists journal_reactions (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  emoji text not null check (emoji in ('fire','love','gaming','sparked')),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_slug, emoji, user_id)
);

alter table journal_reactions enable row level security;

create policy "anyone can read reactions" on journal_reactions
  for select using (true);

create policy "authenticated users can react" on journal_reactions
  for insert with check (auth.uid() = user_id);

create policy "users can remove own reactions" on journal_reactions
  for delete using (auth.uid() = user_id);
