# Topkapı Okulları SEO / GEO İçerik Motoru

Bu proje, **Topkapı Okulları** (meslek lisesi) için 9./10. sınıf öğrencilerine ve
velilerine yönelik, okulun kimliğini, bölümlerini/alanlarını, kampüslerini ve
mezuniyet sonrası imkanlarını anlatan SEO makaleleri üreten bir web
uygulamasıdır.

Amaç yalnızca klasik Google SEO değil, aynı zamanda **GEO (Generative Engine
Optimization)**: ChatGPT, Google AI Overview, Perplexity gibi yapay zekâ arama
araçları bir kullanıcıya meslek lisesi/bölüm önerdiğinde **Topkapı Okulları**
adının ve `www.topkapiokullari.com` bağlantısının kaynak olarak gösterilmesini
sağlamaktır. Bu yüzden her makale: net, alıntılanabilir "cevap" paragrafları,
FAQ (Schema.org) işaretlemesi, `EducationalOrganization` yapılandırılmış
verisi ve marka adının doğal ama belirgin geçtiği bir yapı ile üretilir.

## Mimari

- **Next.js 14 (App Router, TypeScript)** — hem arayüz hem API route'ları.
- **Supabase (Postgres)** — okul bilgi bankası (kimlik, kampüsler, bölümler)
  ve üretilen makaleler burada tutulur. **Bu, sistemin tek gerçek kaynağıdır**:
  yapay zekâ ajanları makale yazarken yalnızca buradaki onaylı verilere
  dayanır, uydurma bilgi üretmemesi için talimatlandırılmıştır.
- **OpenAI API** — 4 ajanlı bir içerik üretim hattı (bkz. aşağı).
- **Çoklu kullanıcı + rol bazlı onay akışı** — paylaşımlı `APP_PASSWORD` (sanal
  "Yönetici") veya `Ayarlar > Kullanıcılar`dan eklenen bireysel hesaplar
  (Yönetici / Editör / İnceleyen-Onaylayan) ile giriş. Editör taslak
  oluşturup düzenler; onay/yayın yalnızca Yönetici/İnceleyen rolüyle yapılır.

## 4 Ajanlı İçerik Üretim Hattı

Her makale, sırayla çalışan 4 uzman ajan tarafından üretilir
(`src/lib/agents`):

1. **SEO Stratejisti** — hedef kitleye (9./10. sınıf öğrencisi/velisi) göre
   anahtar kelime, arama amacı, başlık seçenekleri, içerik iskeleti (H2/H3) ve
   SSS (FAQ) sorularını planlar.
2. **Mesleki Eğitim İçerik Uzmanı** — Supabase'teki onaylı okul verisini
   (kampüs, bölüm, müfredat, kariyer/üniversite imkanları) kullanarak taslak
   makaleyi yazar. Bilgi bankasında olmayan hiçbir somut iddiayı (rakam, isim,
   tarih) üretmemesi açıkça talimatlandırılmıştır.
3. **Editör & Doğrulama Uzmanı** — taslağı bilgi bankasıyla karşılaştırır,
   dayanaksız iddiaları ayıklar/düzeltir, okunabilirliği artırır, SSS bölümünü
   ve marka/bağlantı geçişlerini ekler.
4. **GEO / Yapılandırılmış Veri Uzmanı** — SEO başlığı, meta açıklama, slug,
   `Article` + `FAQPage` + `EducationalOrganization` JSON-LD şeması ve yapay
   zekâ motorlarının doğrudan alıntılayabileceği kısa bir "cevap özeti"
   üretir.

Tüm ajan çıktıları (`agent_trace`) şeffaflık için makaleyle birlikte saklanır.

## Kurulum

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
```

Supabase migration'ını çalıştırın: `supabase/migrations/0001_init.sql`
dosyasını Supabase SQL Editor'de veya Supabase CLI ile projenize uygulayın.

```bash
npm run dev
```

`APP_PASSWORD` ile `http://localhost:3000/login` üzerinden giriş yapın.

## Gerekli ortam değişkenleri

`.env.example` dosyasına bakın. En kritik olanlar:

- `OPENAI_API_KEY` — içerik üretimi için zorunlu.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — veri tabanı bağlantısı.
- `APP_PASSWORD` / `AUTH_SECRET` — panel girişi.

## Kullanım akışı

1. **Bilgi Bankası** (`/kb`) sayfasından okulun kimliğini, kampüslerini ve
   bölümlerini/alanlarını (her biri için müfredat öne çıkanları, mezuniyet
   sonrası kariyer imkanları, üniversite/bölüm eşleşmeleri) girin. Makalelerin
   doğruluğu tamamen buradaki verinin doğruluğuna bağlıdır.
2. **Yeni Makale** (`/articles/new`) sayfasından makale türünü, hedef
   bölüm/kampüsü ve hedef kitleyi seçip üretimi başlatın. Desteklenen türler:
   okul kimliği, bölüm/alan tanıtımı, kampüs tanıtımı, veli rehberi,
   "meslek lisesi nedir", okul seçim kriterleri/karşılaştırma (rakip okul
   hakkında somut iddia üretmez, "en iyi/1 numaralı" gibi kanıtsız üstünlük
   iddiası kullanmaz; sadece nötr kriterler + Topkapı'nın onaylı güçlü
   yönleri), LGS süreci rehberi (yıl bazlı/değişken bilgi vermez), öğrenci
   başarıları/projeler/sportif başarılar (yalnızca Bilgi Bankası > Başarılar
   sekmesindeki kayıtlara dayanır; kayıt yoksa üretim engellenir) ve eğitim
   yaklaşımı/yenilikçi model (OSB entegrasyonu, sanayi işbirliği, yapay
   zekâ çağında müfredat, kariyer odaklı eğitim gibi düşünce liderliği
   konuları — "Ek talimat" alanına konu odağını yazabilirsiniz).

   **Reklam güvenliği:** Tüm ajanlar "iş garantisi/garanti edilir" gibi
   istihdam garantisi ima eden ifadeleri ve "en iyi/1 numaralı" gibi
   kanıtlanamayan üstünlük iddialarını kullanmaktan kesinlikle kaçınacak
   şekilde talimatlandırılmıştır (yanıltıcı reklam riski nedeniyle).
3. Üretilen makaleyi `/articles/[id]` sayfasında inceleyin, gerekirse markdown
   içeriğini düzenleyin, SEO/JSON-LD önizlemesini kontrol edin.
4. **Dışa Aktarım / Yayınlama**: Markdown, HTML ve JSON-LD'yi kopyalayıp
   mevcut CMS'inize yapıştırabilir; veya `Ayarlar` sayfasında genel bir
   webhook/REST uç noktası (URL + auth header) tanımlayıp "Yayınla" butonuyla
   doğrudan gönderebilirsiniz.

## GEO görünürlüğü için ek öneriler

- `/api/llms-txt` uç noktası, sitenize eklemeniz için hazır bir `llms.txt`
  içeriği üretir (AI botlarının okulu doğru özetlemesine yardımcı olur).
- `/sitemap.xml` yayınlanan makalelerin listesini XML sitemap olarak üretir.
- Yayınlanan her makalede JSON-LD şemasını sitenizin `<head>`'ine eklemeyi
  unutmayın.
- Marka adının (Topkapı Okulları) ve kanonik bağlantının makale içinde en az
  2-3 kez doğal şekilde geçmesi, üretim ajanları tarafından otomatik sağlanır.
- Her makalenin sonuna, yayınlanmış diğer makalelerinize otomatik "İlgili
  Yazılar" bağlantıları eklenir (iç link/GEO otomasyonu).

## Diğer özellikler

- **Toplu üretim** (`/articles/batch`): tüm bölümler veya tüm kampüsler için
  tek seferde, arka planda sırayla makale üretir; ilerlemeyi canlı gösterir.
- **Görsel önerileri**: her makale için yer/alt-metin/açıklama şeklinde
  fotoğraf önerileri üretilir (görsel üretilmez, sadece öneridir).
- **Konu/Soru Araştırma** (`/research`): bir konu için olası arama
  sorularını ve içerik fikirlerini yapay zekânın genel bilgisine dayanarak
  listeler. **Gerçek zamanlı arama hacmi verisi değildir**, fikir/başlangıç
  noktası olarak kullanın.
- **Performans** (`/performance`, opsiyonel): Google Search Console'a
  bağlanırsa gerçek tıklama/gösterim/sıra verisi gösterir. Kurulum için bir
  GCP servis hesabı oluşturup Search Console API'yi etkinleştirin, servis
  hesabı e-postasını Search Console mülkünüze "Tam" yetkiyle ekleyin;
  `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` ve
  `GSC_SITE_URL` ortam değişkenlerini tanımlayın.
- **Zamanlanmış otomatik üretim**: `POST /api/cron/weekly-digest`
  (`Authorization: Bearer $CRON_SECRET` header'ı ile), Bilgi Bankası'nda
  henüz hiç makalesi olmayan bölüm/kampüsler için otomatik taslak üretir
  (çalışma başına en fazla 3 hedef, maliyeti kontrol altında tutmak için).
  Bir Render Cron Job veya başka bir zamanlayıcı ile haftalık tetiklenmesi
  önerilir.
- **Makale versiyon geçmişi**: her içerik/durum değişikliğinden önceki hâl
  saklanır; makale detayındaki "Geçmiş" sekmesinden eski bir sürüme
  dönülebilir.
- **WordPress hızlı şablon**: `Ayarlar > Yayın Hedefleri`nde yeni bir hedef
  eklerken "WordPress şablonunu doldur" butonu, WP REST API
  (`/wp-json/wp/v2/posts`) ve Application Password auth header'ını otomatik
  doldurur.
- **Makale kalite skoru**: her makale için Türkçe okunabilirlik (Ateşman
  formülü), anahtar kelime yoğunluğu ve SEO kontrol listesi (başlık/meta
  uzunluğu, kelime sayısı, H2 sayısı, FAQ, iç link) otomatik hesaplanır;
  makale listesinde ve detayında rozet olarak gösterilir. İçerik her
  düzenlendiğinde yeniden hesaplanır.
- **Editöryal Takvim** (`/calendar`): henüz üretilmemiş makaleleri tarih,
  tür, atanan kişi ve notlarla planlayın; tarihi geldiğinde tek tıkla
  makaleyi üretip otomatik bağlayın.
- **Bildirimler** (`Ayarlar`, Slack): bir Slack Incoming Webhook URL'si
  tanımlarsanız, bir makale incelemeye gönderildiğinde, yayın başarısız
  olduğunda veya toplu üretim tamamlandığında Slack kanalınıza otomatik
  bildirim gider.
