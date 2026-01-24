-- Create the 'follows' table if it doesn't exist
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  movie_slug text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  -- Ensure a user can only follow a movie once
  unique(user_id, movie_slug)
);

-- Enable Row Level Security (RLS)
alter table public.follows enable row level security;

-- Policies
create policy "Users can select their own follows"
on public.follows for select
using (auth.uid() = user_id);

create policy "Users can insert their own follows"
on public.follows for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own follows"
on public.follows for delete
using (auth.uid() = user_id);

-- Optional: Index for faster lookups
create index if not exists follows_user_id_idx on public.follows(user_id);
