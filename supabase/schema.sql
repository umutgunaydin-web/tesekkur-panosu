-- =============================================================
-- Teşekkür Panosu - Supabase şeması
-- Supabase Dashboard > SQL Editor içinde tek seferde çalıştırın.
-- Script tekrar çalıştırılabilir (idempotent).
-- =============================================================

create extension if not exists "pgcrypto";

-- 1) Tablo ------------------------------------------------------
create table if not exists public.thanks_messages (
  id                  uuid primary key default gen_random_uuid(),
  message             text        not null check (char_length(trim(message)) between 3 and 500),
  sender              text        not null check (char_length(trim(sender)) between 2 and 60),
  receiver            text        not null check (char_length(trim(receiver)) between 2 and 60),
  receiver_email      text,
  receiver_avatar_url text,
  category_tag        text        not null default 'Destek',
  color_theme         text        not null default 'pink',
  created_at          timestamptz not null default now()
);

-- Mevcut kurulumlar için ek alanlar (avatar entegrasyonu hazırlığı).
alter table public.thanks_messages
  add column if not exists receiver_email text,
  add column if not exists receiver_avatar_url text;

-- Kart paleti; 'rose' tonu sonradan eklendiği için kısıt yeniden kurulur.
alter table public.thanks_messages
  drop constraint if exists thanks_messages_color_theme_check;
alter table public.thanks_messages
  add constraint thanks_messages_color_theme_check
  check (color_theme in ('pink', 'green', 'blue', 'yellow', 'purple', 'rose'));

-- TV ekranı her zaman "son N mesaj" sorgusu attığı için created_at üzerinde index.
create index if not exists thanks_messages_created_at_idx
  on public.thanks_messages (created_at desc);

-- Moderasyon alanları. Mevcut yayınlar onaylı kalır; yeni kayıtlar pending başlar.
alter table public.thanks_messages
  add column if not exists status text,
  add column if not exists moderation_decision text,
  add column if not exists moderation_reason text,
  add column if not exists moderation_confidence numeric,
  add column if not exists moderated_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists rejection_email_sent_at timestamptz;

update public.thanks_messages
set
  status = 'approved',
  moderation_decision = coalesce(moderation_decision, 'APPROVE'),
  moderation_reason = coalesce(moderation_reason, 'Moderasyon öncesi yayınlanmış kayıt'),
  moderated_at = coalesce(moderated_at, created_at),
  published_at = coalesce(published_at, created_at)
where status is null;

alter table public.thanks_messages
  alter column status set default 'pending';

alter table public.thanks_messages
  alter column status set not null;

alter table public.thanks_messages
  drop constraint if exists thanks_messages_status_check;
alter table public.thanks_messages
  add constraint thanks_messages_status_check
  check (status in ('pending', 'approved', 'rejected', 'removed', 'moderation_error'));

alter table public.thanks_messages
  drop constraint if exists thanks_messages_moderation_decision_check;
alter table public.thanks_messages
  add constraint thanks_messages_moderation_decision_check
  check (moderation_decision is null or moderation_decision in ('APPROVE', 'REJECT'));

alter table public.thanks_messages
  drop constraint if exists thanks_messages_moderation_confidence_check;
alter table public.thanks_messages
  add constraint thanks_messages_moderation_confidence_check
  check (
    moderation_confidence is null
    or (moderation_confidence >= 0 and moderation_confidence <= 1)
  );

create index if not exists thanks_messages_approved_created_at_idx
  on public.thanks_messages (created_at desc)
  where status = 'approved';

alter table public.thanks_messages
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid,
  add column if not exists remove_reason text;

-- 2) Realtime ----------------------------------------------------
-- Teşekkür satırının tamamı yayınlanmaz; moderasyon alanları sızmasın.
-- Görünürlük değişimi wall_signals üzerinden gider (yönetim paneli bölümü).
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

-- 3) Row Level Security -----------------------------------------
alter table public.thanks_messages enable row level security;

-- Pano yalnızca onaylanmış mesajları okuyabilir.
drop policy if exists "thanks_messages_public_read" on public.thanks_messages;
create policy "thanks_messages_public_read"
  on public.thanks_messages
  for select
  to anon, authenticated
  using (status = 'approved');

-- Herkes mesaj bırakabilir; güncelleme/silme yetkisi verilmez.
drop policy if exists "thanks_messages_public_insert" on public.thanks_messages;
create policy "thanks_messages_public_insert"
  on public.thanks_messages
  for insert
  to anon, authenticated
  with check (true);

-- 4) Çalışan dizini ------------------------------------------------
-- Kolay İK dışa aktarımı scripts/import-employees.ts ile yüklenir.
-- Ayrıntı: supabase/migrations/20260926030000_employees_directory.sql
create table if not exists public.employees (
  id             uuid primary key default gen_random_uuid(),
  name           text        not null check (char_length(trim(name)) between 2 and 120),
  email          text        not null,
  avatar_url     text,
  is_active      boolean     not null default true,
  source         text        not null default 'kolayik',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_synced_at timestamptz
);

create unique index if not exists employees_email_key
  on public.employees (email);

alter table public.thanks_messages
  add column if not exists recipient_employee_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'thanks_messages_recipient_employee_id_fkey'
  ) then
    alter table public.thanks_messages
      add constraint thanks_messages_recipient_employee_id_fkey
      foreign key (recipient_employee_id)
      references public.employees (id);
  end if;
end $$;

create index if not exists thanks_messages_recipient_employee_id_idx
  on public.thanks_messages (recipient_employee_id);

alter table public.employees enable row level security;

drop policy if exists "employees_public_read_active" on public.employees;
create policy "employees_public_read_active"
  on public.employees
  for select
  to anon, authenticated
  using (is_active);

-- Yeni teşekkürler serbest metin yerine çalışan kimliği taşır.
drop policy if exists "thanks_messages_public_insert" on public.thanks_messages;
create policy "thanks_messages_public_insert"
  on public.thanks_messages
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and recipient_employee_id is not null
    and exists (
      select 1
      from public.employees
      where employees.id = recipient_employee_id
        and employees.is_active
    )
  );

-- Onay ve ret yalnızca service role ile yapılır. İstemci güncelleyemez.
revoke update, delete on table public.thanks_messages from anon, authenticated;

-- 5) Örnek veri eklenmez.
-- Eski serbest metin kayıtları (recipient_employee_id boş) olduğu gibi kalır
-- ve isimle yaklaşık eşleştirilmez. Dizin CSV ile doldurulur.

-- 6) Yönetim paneli
-- Ayrıntılı ve tekrar çalıştırılabilir sürüm:
-- supabase/migrations/20260926040000_admin_panel.sql
-- Yeni kurulumda bu dosyadan sonra o migration da çalıştırılmalıdır.
