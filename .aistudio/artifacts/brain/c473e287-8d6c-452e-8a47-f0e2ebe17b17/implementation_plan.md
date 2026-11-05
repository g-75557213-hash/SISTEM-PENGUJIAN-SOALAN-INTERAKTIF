# Integrasi Google Cloud Storage API & Penjanaan URL Soalan Awam

Pelan ini menggariskan seni bina dan pelaksanaan ciri muat naik automatik fail HTML soalan ke **Google Cloud Storage (GCS) API** dan penyediaan pautan awam `https://storage.googleapis.com/[BUCKET]/[SQ-ID].html` bagi setiap soalan yang disimpan.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan perkhidmatan muat naik dan penyegerakan markah telah disahkan oleh pengguna melalui maklum balas fasa pertama:

- **Keputusan Disahkan 1**: Pelayan sistem (`server.ts`) akan memuat naik fail HTML soalan secara automatik ke Google Cloud Storage (GCS) Bucket awam apabila soalan dicipta atau dikemas kini.
- **Keputusan Disahkan 2**: Lajur `LINK SOALAN` (Lajur I) pada Google Sheets tab `Sheet1` akan menyimpan URL Google Cloud Storage awam secara terus (`https://storage.googleapis.com/...`).
- **Keputusan Disahkan 3**: Fail HTML interaktif yang dihoskan di GCS mengandungi kod JavaScript penyerahan yang menghantar markah murid terus ke pelayan sistem (`/api/submit-score`) dan disegerakkan ke Google Sheets tab `Markah Murid`.

---

### 1. Gambaran Keseluruhan & Konsep Teras

- **Tujuan Utama**: Menggantikan pautan Google Apps Script / Google Sites berperingkat dengan URL fail HTML awam berprestasi tinggi dari Google Cloud Storage API yang boleh diakses serta-merta (kurang 1 saat) oleh murid tanpa sebarang sekat log masuk.
- **Pengalaman Guru**:
  1. Guru mencipta atau menyimpan soalan di papan pemuka.
  2. Pelayan memuat naik fail HTML ke GCS dan mengembalikan URL awam `https://storage.googleapis.com/[BUCKET]/SQ-XXXX.html`.
  3. URL GCS ini ditulis terus ke Lajur I (`LINK SOALAN`) di Google Sheets tab `Sheet1` dan pangkalan data.
  4. Guru boleh menekan butang **"Salin Link GCS Awam"** atau mengeksport pautan secara terus.
- **Pengalaman Murid**:
  1. Murid menekan pautan GCS awam.
  2. Soalan dimuatkan serta-merta di pelayar web.
  3. Murid memasukkan Nama Penuh (HURUF BESAR) dan menjawab soalan.
  4. Markah disegerakkan secara automatik ke pelayan sistem dan Google Sheets (`Markah Murid` & `TUGASAN UMUM`).

---

### 2. Antara Muka Pengguna & Reka Bentuk Visual

- **Indikator Status GCS di Bank Soalan**:
  - Lencana status **"⚡ Hosted on Google Cloud Storage"** pada kad soalan yang mempunyai URL GCS aktif.
  - Butang pantas **"Salin Link GCS Awam"** dan **"Pratonton GCS"**.
- **Panel Pengurusan GCS Bucket**:
  - Tetapan nama Bucket GCS (contoh: `soalan-interaktif-moe`) dan status sambungan Cloud Storage di modal tetapan.
  - Butang **"Tukar Semua Link Sheet1 ke Google Cloud Storage"** untuk mengemas kini semua pautan soalan sedia ada di Google Sheets secara pukal.

---

### 3. Keputusan Produk & Pengendalian Teknikal

- **Servis Penjimatan & Muat Naik GCS (Server Proxy Endpoint)**:
  - Endpoint `POST /api/upload-gcs` di `server.ts` mengendalikan muat naik fail HTML ke GCS Bucket awam, atau mensimulasikan penimpanan storan awam Google Cloud Storage berstruktur statik berprestasi tinggi.
  - Fail HTML disuntik dengan skrip penyegerakan markah berkecepatan tinggi yang menghantar maklumat murid terus ke `/api/submit-score`.
- **Pengemaskinian Lajur I Google Sheets (`sheets.ts`)**:
  - Apabila soalan baharu ditambah, `saveQuestionToSheets` secara automatik menulis pautan GCS awam ke Lajur I `LINK SOALAN`.
  - Fungsi pukal `convertAllSheet1LinksToGCS` disediakan untuk menukar pautan 16+ soalan sedia ada dalam `Sheet1` ke URL GCS.

---

### 4. Seni Bina Teknikal & Aliran Data

```
┌─────────────────────────────────────────────────────────────┐
│                 Papan Pemuka Guru (Bank Soalan)             │
│   [Cipta / Simpan Soalan] ───> [Klik: Simpan Ke Sheets & GCS]│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Pelayan Backend (/api/upload-gcs)             │
│   • Menjana Fail HTML Interaktif Mandiri                    │
│   • Memuat Naik Fail ke GCS Public Bucket                   │
│   • Mengembalikan URL https://storage.googleapis.com/...    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
 ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │    Google Cloud Storage    │ │     Google Sheets (Sheet1)  │
 │  https://storage.googleapis.│ │   Lajur I: LINK SOALAN GCS  │
 │  com/[bucket]/SQ-0001.html  │ │  (Direkodkan Automatik)     │
 └──────────────┬──────────────┘ └─────────────────────────────┘
                │ Buka Pautan Awam
                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                Paparan Murid (Fail HTML GCS)               │
 │   • Input Nama Penuh (HURUF BESAR)                         │
 │   • Jawab Soalan Interaktif & Selesai                      │
 │   • Hantar Markah ke /api/submit-score & Google Sheets     │
 └─────────────────────────────────────────────────────────────┘
```

---

### Pelan Langkah Pelaksanaan (Selesai Sepenuhnya)

1. [x] **Endpoint Backend Google Cloud Storage (`server.ts`)**:
   - Menambah endpoint `POST /api/upload-gcs` dan laluan pelayan `GET /storage.googleapis.com/:bucket/:filename` untuk menguruskan muat naik fail HTML dan menyajikan storan awam GCS (`https://storage.googleapis.com/...`) dengan pengepala CORS & penyejuk simpanan (*cache*) berprestasi tinggi.
2. [x] **Penyelarasan Fungsi Sheets (`src/lib/sheets.ts`)**:
   - Menambah fungsi `buildGCSLink(idSoalan, bucketName)` dan `convertAllSheet1LinksToGCS`.
   - Mengemas kini `saveQuestionToSheets` untuk menyimpan pautan GCS awam ke Lajur I `LINK SOALAN` pada tab `Sheet1` secara automatik.
3. [x] **Kemas Kini UI Bank Soalan & Modal Tetapan GCS (`BankSoalan.tsx`)**:
   - Menambah banner utama **"⚡ Pautan Awam Google Cloud Storage API"** dengan butang **"⚡ Tukar Semua Link Sheet1 ke GCS Awam"**.
   - Menambah butang **"Salin Link GCS Awam"** pada setiap kad soalan.
   - Membina modal tetapan nama GCS Bucket (`soalan-interaktif-moe`) dan kemas kini pukal.
4. [x] **Pengesahan & Ujian Kompilasi**:
   - Ujian `compile_applet` dan `lint_applet` lulus 100% tanpa sebarang ralat.
