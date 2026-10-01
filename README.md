# Bir Teşekkür Bırak — AloTech Teşekkür Panosu

Şirket içi teşekkür mesajlarının ofis TV'sinde gerçek zamanlı yayınlandığı kiosk ekranı
ve çalışanların telefonundan mesaj bıraktığı mobil form.

- `/` → TV ekranı (kiosk): sol sabit mor panel + sağda 3x2 kart duvarı, Supabase Realtime ile canlı akış.
- `/gonder` → QR kod ile açılan mobil öncelikli gönderim formu.

## Stack

Next.js 15 (App Router) · Tailwind CSS v4 · shadcn/ui tabanlı bileşenler · framer-motion · Supabase · Vercel

## 1. Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` içindeki değerleri Supabase panelinden (Project Settings > API) doldurun:

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) anahtarı |
| `NEXT_PUBLIC_SITE_URL` | QR kodun işaret edeceği adres (prod domaini) |

## 2. Veritabanı

`supabase/schema.sql` dosyasının tamamını Supabase Dashboard > SQL Editor içinde çalıştırın.
Script; `thanks_messages` ve `employees` tablolarını, index'leri, realtime publication
kaydını ve RLS politikalarını oluşturur. Script tekrar çalıştırılabilir.

Çalışan dizini Kolay İK CSV'sinden yüklenir. Proje `supabase link` ile bağlıysa ek anahtar
gerekmez. CLI yoksa `.env.local` içine sunucu tarafı `SUPABASE_SERVICE_ROLE_KEY` ekleyin
(bu anahtar tarayıcıya hiç çıkmaz):

```bash
npm run import:employees -- ./data/kolayik_all_employees.csv
```

Aktarım e-posta üzerinden upsert yapar: aynı dosyayı tekrar çalıştırmak kayıt çoğaltmaz
ve mevcut çalışan kimliklerini korur. CSV'de olmayan çalışanlar silinmez.

> Bu repodaki kurulum `dkamtprvficztuasgadc` projesine bağlı. 128 çalışan yüklendi,
> 12 tanesinin avatarı yok.

## Moderasyon

Yeni teşekkür `pending` olarak kaydedilir. Sunucu aksiyonu önce Claude Haiku 4.5 ile değerlendirir;
Claude yanıt veremezse Gemini modellerine sırayla düşer (`lib/moderation/config.ts`).
Onaylanan kayıt `approved` olur ve pano yalnızca bu durumu okur. Ret, hata ve bekleyen
kayıtlar ekrana düşmez. İstemci `status` güncelleyemez.

`.env.local` içine, hepsi sunucu tarafında:

| Değişken | Açıklama |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Onay ve ret yazmak için |
| `ANTHROPIC_API_KEY` | Birincil moderasyon (Claude Haiku 4.5) |
| `GEMINI_API_KEY` | Yedek moderasyon, Google AI Studio anahtarı |
| `ADMIN_AFFAIRS_EMAIL` | Ret bildiriminin alıcısı |
| `RESEND_API_KEY` | E-posta sağlayıcısı |
| `EMAIL_FROM` | Gönderen adres (Resend'de doğrulanmış alan adı) |

Model adı tek yerde: `lib/moderation/config.ts` (`gemini-3.8-flash`).

Edge Function kullanılmıyor. Anahtarlar Vercel ortam değişkenlerine eklenir, Supabase
secret gerekmez.

## Yönetim paneli

Adres: http://localhost:3000/admin

Giriş Supabase Auth e-posta ve şifre ile yapılır. Yetki `profiles.role` alanındadır.
İzin verilen roller: `admin` ve `administrative_affairs_manager`. Diğer hesaplar panele
giremez. E-posta ön yüzde sabitlenmez.

Rol atamak için SQL Editor:

```sql
update public.profiles
set role = 'administrative_affairs_manager'
where email = 'yonetici@sirket.com';
```

Yeni hesap önce Supabase Authentication üzerinden oluşturulur. `handle_new_user`
tetikleyicisi profil satırını `user` rolüyle açar; rol yukarıdaki güncellemeyle verilir.

"Yayından Kaldır" kaydı silmez. `status` `removed` olur, `removed_at`, `removed_by`
ve `remove_reason` dolar, `recognition_admin_actions` tablosuna `REMOVE` yazılır.
"Tekrar Yayınla" durumu yeniden `approved` yapar; kaldırma alanlarını silmez ve
`RESTORE` denetim satırı ekler. Ret ve moderasyon hatası bu sürümde salt okunurdur.

İstemci `thanks_messages` üzerinde update yetkisine sahip değildir. Kaldırma ve
geri alma yalnızca sunucu aksiyonunda, service role ile ve yönetici oturumu
doğrulandıktan sonra çalışır.

## 3. Geliştirme

```bash
npm run dev
```

- TV ekranı: http://localhost:3000
- Form: http://localhost:3000/gonder

## 4. Vercel'e deploy

1. Repoyu Vercel'e bağlayın.
2. Project Settings > Environment Variables altına yukarıdaki üç değişkeni ekleyin
   (`NEXT_PUBLIC_SITE_URL` production domainiyle aynı olmalı ki QR kod doğru adrese gitsin).
3. Deploy sonrası TV'deki tarayıcıyı `https://<domain>/` adresinde kiosk/tam ekran modunda açın.

## Ekran davranışı

- Hedef çözünürlük 1920x1080; tipografi ve boşluklar `clamp()` ile 1366x768'e kadar ölçekleniyor.
- Kart yerleşimi sabit **3 sütun x 2 satır**, sayfa başına en fazla 6 kart. Üçten az sonuç
  kalınca ızgara tek satıra düşer, kartlar uzar ve mesaj dikeyde ortalanır.
- Birden fazla sayfa varsa kartlar **12 saniyede bir** otomatik döner. Filtreye tıklamak veya
  noktalardan sayfa seçmek sayacı sıfırlar, ekran anında kaymaz.
- Bellekte en fazla 30 mesaj tutulur (`MAX_VISIBLE_MESSAGES`); yeni mesaj realtime ile
  listenin başına eklenir ve `framer-motion` ile yumuşakça yerleşir.
- Realtime aboneliği `useThanksStream` içinde açılır, unmount'ta `removeChannel` ile kapatılır.
  Bağlantı koparsa 60 saniyede bir yedek `refresh` çalışır.
- Başlıktaki "Bu ay paylaşılan teşekkür sayısı" değeri Supabase'den gelir (bu ayın kayıt sayısı)
  ve her yeni mesajda anında artar.

## Bileşen haritası

| Bileşen | Sorumluluk |
| --- | --- |
| `components/wall/AppreciationWall` | Filtre, sayfalama, otomatik dönüş ve realtime durumunu yönetir |
| `components/wall/Sidebar` + `QrCard` + `AloTechLogo` | Sol mor panel, QR çağrısı ve marka |
| `components/wall/WallHeader` | El yazısı başlık, tarih/saat ve aylık sayaç |
| `components/wall/CategoryFilters` | Tümü / Ekip Arkadaşları / Destek / İş Birliği / İlham / Diğer |
| `components/wall/RecognitionGrid` + `RecognitionCard` | Pastel kartlar, dekoratif ikonlar |
| `components/wall/PaginationDots` | Alt ortadaki sayfa noktaları |
| `components/form/SubmitForm` + `EmployeePicker` | Form ve aranabilir çalışan seçici |
| `components/wall/Avatar` | Fotoğraf ya da baş harf; bozuk adreste de baş harfe düşer |

Filtre etiketleri `lib/categories.ts` içinde eşlenir: "Ekip Arkadaşları" → `Ekip Ruhu`,
"Diğer" ise adlandırılmış filtrelere girmeyen tüm etiketleri toplar.

## Çalışan dizini

QR formu alıcıyı serbest metin olarak almaz. "Kime teşekkür etmek istiyorsun?" alanı
aktif çalışanları bir kez yükler ve ad ya da e-posta ile yerelde aratır. Seçim
`employees.id` olarak kaydedilir.

Yeni teşekkür satırı `recipient_employee_id` yabancı anahtarını taşır. Karttaki ad ve
fotoğraf her zaman `employees` satırından okunur; avatar teşekkür kaydına kopyalanmaz.
Böylece dizindeki fotoğraf güncellenince eski kartlar da yenilenir. E-posta yalnızca
aramada ve eşleştirmede kullanılır, TV kartında gösterilmez.

Fotoğraf yoksa veya S3 adresi hata verirse kart baş harfe düşer (`Zeynep Köpüklü` → ZK).
Eski serbest metin kayıtları (`recipient_employee_id` boş) olduğu gibi kalır; isimle
yaklaşık eşleştirme yapılmaz.

Anon anahtar yalnızca aktif çalışanların `id`, `name`, `email`, `avatar_url` alanlarını
okuyabilir. Dizin ekleme, güncelleme ve silme anon role kapalıdır.

## Anonim gönderim

Formdaki "Adımı gizle, anonim gönder" seçeneği işaretlendiğinde kayıt `Anonim` gönderen
adıyla yazılır. Panoda anonim mesajlar diğerleriyle aynı görsel ağırlıkta gösterilir.

## Tepkiler, bildirimler ve istatistikler

- `/pano` → telefondan panodaki mesajlara 👏 / 💜 bırakılan sayfa. Sayılar TV kartlarında
  realtime görünür (`reaction_counts`). Cihaz başına mesaj ve tür için bir tepki.
- Yayına giren teşekkür alıcıya e-postayla bildirilir (`lib/email/recipient.ts`), kayıt başına bir kez.
  Resend'in `onboarding@resend.dev` adresi yalnız hesap sahibine gönderir; çalışanlara ulaşması için
  `EMAIL_FROM` doğrulanmış bir alan adından olmalı.
- `/admin/istatistik?ay=2026-10` → aylık özet: en çok teşekkür alan/eden, kategori, günlük dağılım,
  en çok tepki alan mesajlar ve moderasyonu yapan model.

Gönderim isimle yapılır; anonim seçenek yoktur. Kayıtlar yalnız sunucu aksiyonundan (service role)
eklenir. Aynı IP'den 10 dakikada 20 gönderim ve Claude için günlük 200 moderasyon sınırı vardır
(`lib/limits.ts`); sınır dolunca moderasyon Gemini ile sürer.
