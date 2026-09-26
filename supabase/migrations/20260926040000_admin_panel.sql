-- Yönetim paneli: yumuşak kaldırma, roller ve pano sinyali.
-- Kayıtlar silinmez. Anon hâlâ yalnızca yayındaki mesajı okur.

alter table public.thanks_messages
  drop constraint if exists thanks_messages_status_check;
alter table public.thanks_messages
  add constraint thanks_messages_status_check
  check (status in ('pending', 'approved', 'rejected', 'removed', 'moderation_error'));

alter table public.thanks_messages
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid,
  add column if not exists remove_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'thanks_messages_removed_by_fkey'
  ) then
    alter table public.thanks_messages
      add constraint thanks_messages_removed_by_fkey
      foreign key (removed_by) references auth.users (id);
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user'
    check (role in ('user', 'admin', 'administrative_affairs_manager')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select id, coalesce(email, '')
from auth.users
on conflict (id) do nothing;

create table if not exists public.recognition_admin_actions (
  id uuid primary key default gen_random_uuid(),
  recognition_id uuid not null references public.thanks_messages (id),
  admin_user_id uuid not null references auth.users (id),
  action text not null check (action in ('REMOVE', 'RESTORE')),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.recognition_admin_actions enable row level security;

drop policy if exists "recognition_admin_actions_admin_read" on public.recognition_admin_actions;
create policy "recognition_admin_actions_admin_read"
  on public.recognition_admin_actions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'administrative_affairs_manager')
    )
  );

-- İstemci doğrudan güncelleyemez. Kaldırma yalnızca sunucu aksiyonundan,
-- service role ile ve yönetici oturumu doğrulandıktan sonra yapılır.
revoke update, delete on table public.thanks_messages from anon, authenticated;
revoke insert, update, delete on table public.recognition_admin_actions from anon, authenticated;

create table if not exists public.wall_signals (
  id bigint generated always as identity primary key,
  recognition_id uuid not null,
  visible boolean not null,
  created_at timestamptz not null default now()
);

alter table public.wall_signals enable row level security;

drop policy if exists "wall_signals_public_read" on public.wall_signals;
create policy "wall_signals_public_read"
  on public.wall_signals
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.wall_signals from anon, authenticated;
grant select on table public.wall_signals to anon, authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.recognition_admin_actions to authenticated;

-- Moderasyon gerekçesi ve kaldırma kaydı istemciden okunamaz.
-- Pano yalnızca kartın ihtiyaç duyduğu sütunları seçer.
revoke select on table public.thanks_messages from anon, authenticated;
grant select (
  id,
  message,
  sender,
  receiver,
  recipient_employee_id,
  category_tag,
  color_theme,
  created_at,
  status
) on table public.thanks_messages to anon, authenticated;

-- Tam satır realtime yayını moderasyon alanlarını da taşırdı.
-- Görünürlük artık wall_signals üzerinden gider.
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'thanks_messages'
  ) then
    alter publication supabase_realtime drop table public.thanks_messages;
  end if;
end $$;

create or replace function public.notify_wall_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'approved' then
      insert into public.wall_signals (recognition_id, visible)
      values (new.id, true);
    elsif old.status = 'approved' then
      insert into public.wall_signals (recognition_id, visible)
      values (new.id, false);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists thanks_messages_wall_visibility on public.thanks_messages;
create trigger thanks_messages_wall_visibility
  after update of status on public.thanks_messages
  for each row execute function public.notify_wall_visibility();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wall_signals'
  ) then
    alter publication supabase_realtime add table public.wall_signals;
  end if;
end $$;
