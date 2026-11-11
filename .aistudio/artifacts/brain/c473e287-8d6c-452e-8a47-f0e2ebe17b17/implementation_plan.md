# Penjenamaan Semula Sistem & Penjanaan Soalan Interaktif 1-Klik Gemini AI

Pelan pelaksanaan bagi menaik taraf penjenamaan nama sistem dan memperkenalkan fungsi penjanaan soalan interaktif secara automatik 1-klik terus ke dalam aplikasi (menggunakan Gemini API) di samping mengekalkan pilihan membuka laman web Google Gemini dengan salinan prompt automatik.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan maklum balas anda dalam sesi klarifikasi:
> - **Penjenamaan Sistem**:
>   - Tajuk Utama diubah daripada *"SISTEM PENGUJIAN & GAMIFIKASI SMK JENERI"* kepada **"SOALAN INTERAKTIF & GAMIFIKASI"**.
>   - Sub-tajuk diubah daripada *"PLATFORM PENDIDIKAN DUAL-MOD KSSM (GOOGLE CLASSROOM & GEMINI AI)"* kepada **"PLATFORM PENDIDIKAN DIGITAL DENGAN INTEGRASI GOOGLE CLASSROOM & GEMINI AI"**.
>   - Metadata sistem (`metadata.json`) dan tajuk dokumen (`<title>` di `index.html`) diselaraskan sepenuhnya.
> - **Dwi-Pilihan Penjanaan Soalan di Modal Prompt**:
>   - **Pilihan 1 (⚡ 1-Klik Gemini AI Automatik)**: Guru menekan satu butang, sistem terus memproses prompt menggunakan Gemini API (`gemini-3.8-flash`) pada pelayan, memasukkan kod HTML yang dijana ke dalam editor kod, dan serta-merta membuka serta menguji pratonton soalan interaktif.
>   - **Pilihan 2 (🌐 Buka Google Gemini & Salin Prompt)**: Sistem menyalin prompt lengkap ke papan keratan (clipboard) dan membuka laman web `https://gemini.google.com` dalam tab pelayar baharu dengan notifikasi arahan "Tampal & Jalankan".
>   - **Pilihan 3 (📋 Salin Prompt Sahaja)**: Butang salinan pantas sedia ada kekal untuk fleksibiliti guru.

---

## 1. Overview & Core Concept

* **Tujuan**: Mempercepat aliran kerja guru daripada perancangan soalan kepada ujian interaktif tanpa perlu menyalin, membuka tab lain, dan menampal kod secara manual berulang kali.
* **Penyelesaian Sekatan Pelayar (Browser Security)**: Disebabkan sekatan keselamatan pelayar web (*Same-Origin Policy* dan perlindungan sandbox peribadi), aplikasi web tidak boleh mengawal tab luaran `gemini.google.com` (seperti menaip teks ke input Gemini web orang lain atau membaca outputnya secara automatik). Integrasi Gemini API secara terus di bahagian pelayan menyelesaikan masalah ini sepenuhnya — guru mendapat pengalaman "1-klik terus siap dan terus uji" tanpa sebarang halangan.
* **Pengguna Sasaran**: Guru KSSM yang ingin mencipta latihan interaktif gamifikasi dengan pantas dan murid yang menjawab soalan.

---

## 2. User Experience & Visual Design

### A. Paparan Header Utama & Identiti Sistem
* **Tajuk Baharu**: `SOALAN INTERAKTIF & GAMIFIKASI` dengan tipografi tebal moden bernada ungu nila (*indigo-violet gradient*).
* **Sub-tajuk Baharu**: `PLATFORM PENDIDIKAN DIGITAL DENGAN INTEGRASI GOOGLE CLASSROOM & GEMINI AI` dengan teks kemas berlatar belakang lencana kelabu/biru lembut.
* **Tajuk Tab Pelayar**: Diselaraskan kepada `SOALAN INTERAKTIF & GAMIFIKASI` dalam `index.html`.

### B. Aliran Penjanaan Soalan di Modal Prompt Gemini
1. **Tetapan Prompt**: Guru memilih bilangan soalan (beserta pengiraan nyawa pintar), kriteria soalan, dan pautan video (pilihan).
2. **Kawasan Tindakan (Action Buttons)** di bahagian bawah modal prompt:
   * 🟣 **⚡ Jana Terus Soalan Interaktif (1-Klik Gemini AI)**:
     - Butang utama paling menonjol (*vibrant purple-indigo gradient* berserta ikon kilat animasi).
     - Apabila ditekan: Modal memaparkan status animasi memuatkan (*loading state* dengan teks "Gemini AI sedang membina soalan interaktif lengkap... Sila tunggu sebentar").
     - Setelah siap: Kod HTML dimasukkan ke editor dan skrin pratonton interaktif dibuka secara automatik (*Auto-Preview & Test*). Guru boleh terus menguji butang, soalan, dan sistem pemarkahan.
   * 🔵 **🌐 Buka Google Gemini (Salin Prompt)**:
     - Menyalin teks prompt ke *clipboard*, memaparkan pemberitahuan hijau "Prompt berjaya disalin!", dan serta-merta membuka tab `https://gemini.google.com` di tetingkap baharu.
   * ⚪ **📋 Salin Sahaja**:
     - Menyalin teks prompt untuk kegunaan di platform LLM lain (seperti Claude, ChatGPT).

---

## 3. Key Product Decisions & Trade-Offs

* **Keputusan 1: Pemprosesan Gemini API di Pelayan (`server.ts`)**
  - *Pendekatan*: Panggilan model dilakukan secara selamat di bahagian pelayan (`POST /api/generate-question`) menggunakan SDK `@google/genai` dengan model `gemini-3.8-flash`.
  - *Sebab*: Mengelakkan pendedahan API Key di pelayar, mengelakkan isu CORS, dan membolehkan penapisan serta pembersihan blok kod HTML (cth. membuang pembungkus ` ```html `) sebelum dihantar ke editor.
* **Keputusan 2: Menyediakan Kedua-dua Butang (API Terus + Gemini Web Tab)**
  - *Pendekatan*: Mengikut jawapan pengguna, kedua-dua kaedah disediakan serentak.
  - *Sebab*: Guru yang ingin kepantasan maksimum boleh menggunakan butang 1-Klik; manakala guru yang mempunyai perbualan sedia ada atau ciri khas di `gemini.google.com` boleh menggunakan butang Buka Tab.
* **Keputusan 3: Pengendalian Ralat & Maklum Balas Pengguna**
  - *Pendekatan*: Sekiranya berlaku gangguan rangkaian semasa penjanaan API, sistem memaparkan notifikasi ralat yang jelas berserta butang sandaran "Salin Prompt & Buka Gemini Web".

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ALIRAN PENJANAAN SOALAN GEMINI INTERAKTIF                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │ Modal Prompt Gemini (App.tsx) │
                       │ • Bilangan Soalan & Nyawa     │
                       │ • Kriteria & Pautan Video     │
                       └───────────────┬───────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
 ┌─────────────────────────────┐               ┌─────────────────────────────┐
 │ BUTANG 1: ⚡ 1-KLIK GEMINI   │               │ BUTANG 2: 🌐 BUKA GEMINI WEB │
 └──────────────┬──────────────┘               └──────────────┬──────────────┘
                │                                             │
                ▼                                             ▼
 ┌─────────────────────────────┐               ┌─────────────────────────────┐
 │ POST /api/generate-question │               │ Salin Prompt ke Clipboard   │
 │ Model: gemini-3.8-flash     │               │ Buka https://gemini.google  │
 └──────────────┬──────────────┘               └─────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────┐
 │ Ekstrak Kod HTML Bersih     │
 │ Update State `html` Editor  │
 └──────────────┬──────────────┘
                │
                ▼
 ┌─────────────────────────────┐
 │ Tutup Modal Prompt          │
 │ Buka Pratonton Interaktif   │
 │ (showPreview = true)        │
 └─────────────────────────────┘
```

### Komponen & Perubahan Utama:
1. **`server.ts`**:
   - Endpoint `POST /api/generate-question`: Menerima `{ prompt: string }` atau spesifikasi kuiz.
   - Panggilan `@google/genai` menggunakan model `gemini-3.8-flash` dengan `systemInstruction` yang menjamin output kod HTML5 tunggal (*single-file HTML*) yang sedia dipaparkan dalam `iframe`.
2. **`src/App.tsx`**:
   - Kemas kini teks tajuk header: "SOALAN INTERAKTIF & GAMIFIKASI".
   - Kemas kini sub-tajuk: "PLATFORM PENDIDIKAN DIGITAL DENGAN INTEGRASI GOOGLE CLASSROOM & GEMINI AI".
   - Di dalam modal prompt: Tambah state `isGeneratingAI`, butang 1-Klik dengan loading spinner, butang Buka Google Gemini Web, dan logik auto-isi HTML serta pelancaran pratonton.
3. **`index.html` & `metadata.json`**:
   - Kemas kini `<title>` dan keterangan aplikasi.
