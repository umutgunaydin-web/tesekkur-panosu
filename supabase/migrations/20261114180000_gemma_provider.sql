-- Moderasyonu ekibin Gemma sunucusu da yapabilir.
alter table public.thanks_messages
  drop constraint if exists thanks_messages_moderation_provider_check;
alter table public.thanks_messages
  add constraint thanks_messages_moderation_provider_check
  check (moderation_provider is null or moderation_provider in ('gemma', 'claude', 'gemini', 'local'));
