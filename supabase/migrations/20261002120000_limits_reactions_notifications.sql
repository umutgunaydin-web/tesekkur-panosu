-- Hız sınırı, moderasyon sağlayıcısı, alıcı e-postası ve tepkiler.

alter table public.thanks_messages
  add column if not exists client_hash text,
  add column if not exists moderation_provider text,
  add column if not exists recipient_email_sent_at timestamptz;

alter table public.thanks_messages
  drop constraint if exists thanks_messages_moderation_provider_check;
alter table public.thanks_messages
  add constraint thanks_messages_moderation_provider_check
  check (moderation_provider is null or moderation_provider in ('claude', 'gemini', 'local'));

create index if not exists thanks_messages_client_hash_created_idx
  on public.thanks_messages (client_hash, created_at desc);
create index if not exists thanks_messages_provider_moderated_idx
  on public.thanks_messages (moderation_provider, moderated_at desc);

-- Tepkiler: cihaz başına mesaj ve tür için bir kayıt. Yalnız service role yazar.
create table if not exists public.recognition_reactions (
  recognition_id uuid not null references public.thanks_messages (id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  kind text not null check (kind in ('clap', 'heart')),
  client_hash text,
  created_at timestamptz not null default now(),
  primary key (recognition_id, device_id, kind)
);

create index if not exists recognition_reactions_client_hash_created_idx
  on public.recognition_reactions (client_hash, created_at desc);

alter table public.recognition_reactions enable row level security;
revoke all on table public.recognition_reactions from anon, authenticated;

-- Pano sayıları buradan okur ve realtime ile dinler.
create table if not exists public.reaction_counts (
  recognition_id uuid primary key references public.thanks_messages (id) on delete cascade,
  clap integer not null default 0 check (clap >= 0),
  heart integer not null default 0 check (heart >= 0),
  updated_at timestamptz not null default now()
);

alter table public.reaction_counts enable row level security;

drop policy if exists "reaction_counts_public_read" on public.reaction_counts;
create policy "reaction_counts_public_read"
  on public.reaction_counts
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.reaction_counts from anon, authenticated;
grant select on table public.reaction_counts to anon, authenticated;

create or replace function public.sync_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.recognition_id, old.recognition_id);
begin
  -- Mesaj silinirken tepkiler cascade ile gider; silinen mesaja sayaç yazılmaz.
  if not exists (select 1 from public.thanks_messages where id = target) then
    return null;
  end if;

  insert into public.reaction_counts (recognition_id, clap, heart, updated_at)
  select
    target,
    count(*) filter (where kind = 'clap'),
    count(*) filter (where kind = 'heart'),
    now()
  from public.recognition_reactions
  where recognition_id = target
  on conflict (recognition_id) do update
    set clap = excluded.clap,
        heart = excluded.heart,
        updated_at = excluded.updated_at;
  return null;
end;
$$;

drop trigger if exists recognition_reactions_sync_counts on public.recognition_reactions;
create trigger recognition_reactions_sync_counts
  after insert or delete on public.recognition_reactions
  for each row execute function public.sync_reaction_counts();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reaction_counts'
  ) then
    alter publication supabase_realtime add table public.reaction_counts;
  end if;
end $$;
