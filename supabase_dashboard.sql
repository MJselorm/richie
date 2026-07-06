-- StudyHub dashboard profile fields and RLS hardening.
-- Run this in the Supabase SQL Editor before using the dashboard settings form.

alter table public.profiles
add column if not exists full_name text,
add column if not exists avatar_url text,
add column if not exists student_id text,
add column if not exists program text,
add column if not exists department text,
add column if not exists level text,
add column if not exists phone text,
add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (
        id,
        email,
        role
    )
    values (
        new.id,
        new.email,
        'user'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
