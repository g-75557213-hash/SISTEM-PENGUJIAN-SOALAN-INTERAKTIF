# Integrasi Google Sites & Penjana Kod Embed Interaktif

Pelan ini menggariskan seni bina dan pelaksanaan ciri integrasi **Google Sites** untuk membolehkan mana-mana soalan atau tugasan interaktif dijana dalam bentuk **Kod Embed (HTML / iFrame responsif)** dan pautan khas yang sedia disematkan ke dalam Google Sites guru, dengan penyegerakan markah murid ke sistem dan Google Sheets.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Pihak Google tidak menyediakan API rasmi (REST API) untuk mencipta laman atau menyiarkan (*publish*) halaman *New Google Sites* secara automatik melalui pengaturcaraan luar. Berdasarkan pilihan yang disahkan oleh pengguna, sistem akan melaksanakan **Penjana Kod Embed Pintar (Responsive HTML Embed & Clean Embed URL)** berserta integrasi penuh penyerahan markah murid.

- **Keputusan Disahkan 1**: Sistem menjana kod *embed* HTML dan pautan URL responsif yang dioptimumkan untuk fungsi *Insert > Embed* dalam Google Sites.
- **Keputusan Disahkan 2**: Markah murid yang menjawab di Google Sites akan disegerakkan serentak ke tab **Markah Murid** dalam Google Sheets dan pangkalan data pelayan.

---

### 1. Gambaran Keseluruhan & Konsep Teras

- **Tujuan Utama**: Membolehkan guru menyematkan kuiz dan tugasan interaktif terus ke dalam portal Google Sites peribadi atau sekolah mereka tanpa sebarang halangan teknikal.
- **Pengalaman Guru**:
  1. Guru memilih soalan di **Bank Soalan** atau bahagian **Tugasan Umum**.
  2. Menekan butang baharu **🌐 Google Sites**.
  3. Memilih kelas atau kod tugasan, dan sistem serta-merta menjana:
     - **Kod HTML Embed** (kod `<iframe ...>` dengan kawalan ketinggian dinamik dan responsif).
     - **Pautan URL Embed** (URL bersih yang boleh ditampal pada pilihan *By URL* di Google Sites).
  4. Menyalin kod dengan 1-klik (*One-Click Copy*) dan melihat panduan 3-langkah cara menampal di Google Sites.
- **Pengalaman Murid**:
  1. Murid membuka Google Sites guru.
  2. Soalan kuiz/permainan muncul kemas di dalam laman tanpa bingkai berlebihan (`embed=sites`).
  3. Murid memasukkan nama penuh dalam huruf besar.
  4. Setelah selesai menjawab, markah dihantar secara langsung ke pangkalan data sistem dan direkodkan ke tab `Markah Murid` Google Spreadsheet guru.

---

### 2. Antara Muka Pengguna & Reka Bentuk Visual

- **Butang Tindakan Baru**:
  - Di kad soalan (*Bank Soalan*): Ditambah butang **🌐 Google Sites** di sebelah butang sedia ada (*Google Classroom* dan *Tugasan Umum*).
  - Di bahagian *Tugasan Umum*: Ditambah butang pantas untuk salin kod embed bagi kelas berkenaan.
- **Modal Integrasi Google Sites**:
  - **Pengepala**: Tajuk mesra dengan ikon Google Sites dan panduan ringkas.
  - **Tab Pilihan**:
    1. *Tab 1: Kod Embed HTML (Disyorkan)*: Mengandungi kod `<iframe>` dengan penggayaan CSS selamat, membolehkan soalan menyesuaikan saiz pada skrin telefon dan komputer.
    2. *Tab 2: Pautan URL Google Sites*: Pautan URL terus untuk guru yang lebih suka kaedah *Insert > Embed > By URL*.
  - **Live Preview Box**: Ruang pratonton langsung yang memaparkan soalan seolah-olah ia berada di dalam Google Sites murid.
  - **Panduan Visual Langkah-demi-Langkah**:
    1. Buka laman web di Google Sites (`sites.google.com`).
    2. Klik menu **Insert** (Sisip) ➔ **Embed** (Sematkan).
    3. Pilih **Embed Code** (atau URL) dan klik **Insert**.
    4. Klik **Publish** (Siarkan).

---

### 3. Keputusan Produk & Pengendalian Teknikal

- **Mod Paparan Embed (`embed=sites`)**:
  - Apabila parameter `embed=sites` dikesan dalam URL, `StudentView.tsx` akan membuang sebarang bar atas (*topbar*) atau ruang pembungkus yang tidak diperlukan supaya soalan memanfaatkan 100% keluasan iframe di Google Sites.
- **Penyegerakan Markah Dwi-Saluran (Real-time Dual Sync)**:
  - Markah yang dihantar oleh murid melalui soalan yang disematkan di Google Sites dihantar ke:
    1. Endpoint pelayan `/api/submit-score` untuk semakan segera di papan pemuka guru.
    2. Google Sheets REST API v4 (atau Apps Script Web App) untuk direkodkan ke tab **Markah Murid** di spreadsheet rasmi guru.

---

### 4. Seni Bina Teknikal & Aliran Data

```
┌─────────────────────────────────────────────────────────────┐
│                 Papan Pemuka Guru (Bank Soalan)             │
│   [Pilih Soalan] ───> [Klik: 🌐 Google Sites]               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Modal Penjana Kod Embed Google Sites            │
│   • Penjanaan Kod <iframe ...> Responsif                    │
│   • Penjanaan URL Mod Embed Khusus                          │
│   • Salin 1-Klik & Panduan Visual Google Sites              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Guru tampal kod ke Google Sites
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Laman Google Sites Guru (Paparan Murid)           │
│   <iframe src=".../?qid=SQ-XXX&kod=TU-XXX&embed=sites">     │
│   • Pengesahan Nama Murid (Tiada Halangan Akaun)            │
│   • Kuiz / Simulasi Sains Interaktif                        │
│   • Penyerahan Markah Automatik Selesai Menjawab            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌──────────────────────────┐  ┌──────────────────────────┐
   │      Pelayan Sistem      │  │     Google Sheets API     │
   │    /api/submit-score     │  │    Tab "Markah Murid"     │
   │  (Semakan Guru Semerta)  │  │   (Arkib Rasmi Markah)    │
   └──────────────────────────┘  └──────────────────────────┘
```

---

### Status Pelaksanaan (Selesai Sepenuhnya)

1. [x] **Komponen Modal Penjana Google Sites (`GoogleSitesModal.tsx`)**:
   - Menghasilkan komponen modal khusus yang menjana kod HTML `<iframe>` responsif, pilihan ketinggian (600px, 680px, 780px, 880px), kod URL, butang salin 1-klik, pratonton langsung interaktif (Desktop/Mobile), dan panduan visual langkah-demi-langkah.
2. [x] **Integrasi ke `BankSoalan.tsx` & `SemakanGuru.tsx`**:
   - Menambah butang **"🌐 Embed Google Sites"** pada senarai soalan di Bank Soalan dan panel Tugasan Sedia Ada di Semakan Guru.
3. [x] **Penyelarasan Paparan Murid di `StudentView.tsx`**:
   - Menyokong mod `embed=sites` untuk memaksimumkan kawasan visual soalan di dalam iframe Google Sites tanpa bar navigasi mengganggu.
4. [x] **Penyegerakan Markah Dwi-Saluran**:
   - Penyerahan markah dari Google Sites merekodkan maklumat murid terus ke sistem dan Google Sheets tab `Markah Murid` serta `TUGASAN UMUM`.
5. [x] **Pengesahan & Ujian Kompilasi**:
   - `compile_applet` dan `lint_applet` telah dijalankan dan lulus 100% tanpa sebarang ralat.

