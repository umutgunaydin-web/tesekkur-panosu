-- Moderasyon hatasını yönetici yayına alabilsin. Ret ve bekleyen kayıtlar aynı kalır.

alter table public.recognition_admin_actions
  drop constraint if exists recognition_admin_actions_action_check;

alter table public.recognition_admin_actions
  add constraint recognition_admin_actions_action_check
  check (action in ('REMOVE', 'RESTORE', 'PUBLISH'));
