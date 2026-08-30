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
- Basit paylaşımlı şifre ile korunan bir yönetim paneli (tek kullanıcı/ekip
  senaryosu için yeterli; ileride gerçek auth ile değiştirilebilir).

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
   hakkında somut iddia üretmez, sadece nötr kriterler + Topkapı'nın onaylı
   güçlü yönleri), LGS süreci rehberi (yıl bazlı/değişken bilgi vermez) ve
   öğrenci başarıları/projeler/sportif başarılar (yalnızca Bilgi Bankası >
   Başarılar sekmesindeki kayıtlara dayanır; kayıt yoksa üretim engellenir).
3. Üretilen makaleyi `/articles/[id]` sayfasında inceleyin, gerekirse markdown
   içeriğini düzenleyin, SEO/JSON-LD önizlemesini kontrol edin.
4. **Dışa Aktarım / Yayınlama**: Markdown, HTML ve JSON-LD'yi kopyalayıp
   mevcut CMS'inize yapıştırabilir; veya `Ayarlar` sayfasında genel bir
   webhook/REST uç noktası (URL + auth header) tanımlayıp "Yayınla" butonuyla
   doğrudan gönderebilirsiniz.

## GEO görünürlüğü için ek öneriler

- `/api/llms-txt` uç noktası, sitenize eklemeniz için hazır bir `llms.txt`
  içeriği üretir (AI botlarının okulu doğru özetlemesine yardımcı olur).
- Yayınlanan her makalede JSON-LD şemasını sitenizin `<head>`'ine eklemeyi
  unutmayın.
- Marka adının (Topkapı Okulları) ve kanonik bağlantının makale içinde en az
  2-3 kez doğal şekilde geçmesi, üretim ajanları tarafından otomatik sağlanır.
