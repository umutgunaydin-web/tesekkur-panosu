-- Kültür ekranı: İK'nın panelden girdiği içerikler ve görselleri.
-- Yazma yalnız sunucu aksiyonlarından (service role) yapılır; pano yalnız
-- yayındaki içerikleri okur. Planlandı / Yayında / Süresi doldu tarihlerden türetilir.

create table if not exists public.culture_slides (
  id                  uuid primary key default gen_random_uuid(),
  type                text        not null,
  eyebrow             text        not null default '',
  title               text        not null,
  body                text        not null default '',
  bullets             text[]      not null default '{}',
  event_at            timestamptz,
  location            text,
  image_path          text,
  person_employee_id  uuid references public.employees (id) on delete set null,
  person_role         text,
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz not null,
  sort_order          integer     not null default 0,
  status              text        not null default 'draft',
  created_by          uuid references auth.users (id) on delete set null,
  updated_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint culture_slides_type_check
    check (type in ('duyuru', 'etkinlik', 'yeni_katilan', 'ik', 'politika', 'haber')),
  constraint culture_slides_status_check
    check (status in ('draft', 'published')),
  -- Sınırlar lib/culture/model.ts SLIDE_LIMITS ile aynı; **kalın** işaretine pay bırakılır.
  constraint culture_slides_title_check
    check (char_length(replace(title, '**', '')) between 2 and 60),
  constraint culture_slides_body_check
    check (char_length(replace(body, '**', '')) <= 180),
  constraint culture_slides_eyebrow_check
    check (char_length(eyebrow) <= 40),
  constraint culture_slides_bullets_check
    check (cardinality(bullets) <= 3),
  constraint culture_slides_location_check
    check (location is null or char_length(location) <= 40),
  constraint culture_slides_person_role_check
    check (person_role is null or char_length(person_role) <= 60),
  constraint culture_slides_window_check
    check (ends_at > starts_at),
  constraint culture_slides_new_hire_check
    check (type <> 'yeni_katilan' or person_employee_id is not null)
);

create index if not exists culture_slides_live_idx
  on public.culture_slides (status, starts_at, ends_at, sort_order);
create index if not exists culture_slides_person_idx
  on public.culture_slides (person_employee_id);

alter table public.culture_slides enable row level security;

drop policy if exists "culture_slides_public_read_published" on public.culture_slides;
create policy "culture_slides_public_read_published"
  on public.culture_slides
  for select
  to anon, authenticated
  using (status = 'published');

revoke all on table public.culture_slides from anon, authenticated;
-- Pano yalnız gösterim alanlarını okur; kimin girdiği okunmaz.
grant select (
  id, type, eyebrow, title, body, bullets, event_at, location, image_path,
  person_employee_id, person_role, starts_at, ends_at, sort_order, status
) on table public.culture_slides to anon, authenticated;

-- Görseller: herkese açık okuma (TV giriş yapmaz), yükleme yalnız
-- sunucunun verdiği imzalı URL ile. 2 MB ve yalnız JPEG/WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('culture-images', 'culture-images', true, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
