-- Çalışan dizini (Kolay İK) ve teşekkür kayıtlarının çalışana bağlanması.
-- Tekrar çalıştırılabilir.

create extension if not exists "pgcrypto";

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

-- E-posta Kolay İK'taki kalıcı kimliktir; küçük harfe sabitlenir.
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

-- Yeni kayıtlar listeden seçilmiş aktif bir çalışana bağlanmak zorunda.
drop policy if exists "thanks_messages_public_insert" on public.thanks_messages;
create policy "thanks_messages_public_insert"
  on public.thanks_messages
  for insert
  to anon, authenticated
  with check (
    recipient_employee_id is not null
    and exists (
      select 1
      from public.employees
      where employees.id = recipient_employee_id
        and employees.is_active
    )
  );

alter table public.employees enable row level security;

-- QR formu yalnızca aktif çalışanların dizin alanlarını okuyabilir.
drop policy if exists "employees_public_read_active" on public.employees;
create policy "employees_public_read_active"
  on public.employees
  for select
  to anon, authenticated
  using (is_active);

-- Yazma politikası yok: anon/authenticated insert, update ve delete yapamaz.
-- Dizin yalnızca service role (RLS bypass) veya SQL editörü ile güncellenir.
