-- Teşekkür moderasyonu. Mevcut yayınlanmış kayıtlar gizlenmez.
-- Yeni kayıtlar pending başlar ve yalnızca sunucu onaylayabilir.

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
  check (status in ('pending', 'approved', 'rejected', 'moderation_error'));

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

drop policy if exists "thanks_messages_public_read" on public.thanks_messages;
create policy "thanks_messages_public_read"
  on public.thanks_messages
  for select
  to anon, authenticated
  using (status = 'approved');

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

revoke update, delete on table public.thanks_messages from anon, authenticated;
