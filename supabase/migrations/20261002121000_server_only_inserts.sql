-- Gönderim yalnız sunucu aksiyonundan (service role) yapılır; hız sınırı ve
-- moderasyon doğrudan REST çağrısıyla atlanamasın.
drop policy if exists "thanks_messages_public_insert" on public.thanks_messages;
revoke insert on table public.thanks_messages from anon, authenticated;
