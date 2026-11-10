# Integrasi Pengesahan Akaun Google Classroom & Padanan Roster Murid

Pelan komprehensif bagi memulihkan dan menambah baik aliran pengesahan akaun murid Google Classroom secara automatik, padanan nama murid pintar (fuzzy matching) dengan senarai Google Classroom roster, kad pengesahan profil penuh ("Adakah ini nama anda?"), serta panel penyelarasan guru untuk nama sepadan / berulang.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawapan anda dalam sesi klarifikasi (Phase 1), keputusan reka bentuk berikut telah dimuktamadkan:
> - **Pengesanan Akaun Google**: Sistem akan menyemak akaun Google sedia ada dalam pelayar Chrome secara automatik; jika belum dikesan, paparan log masuk Google yang lancar disediakan sebagai fallback.
> - **Paparan Murid**: Kad profil penuh dipaparkan dengan soalan *"Adakah ini nama anda?"* berserta dua butang tindakan jelas: Butang **Pasti** (mengesahkan nama rasmi dan meneruskan ke kuiz) dan Butang **Tukar / Taip Manual** (untuk murid yang menggunakan peranti kongsi atau akaun ibu bapa/nama panggilan).
> - **Pengendalian Nama Pendek / Padanan Hampir**: Jika murid memasukkan nama pendek atau variasi nama, sistem akan mencari padanan nama rasmi dalam Google Classroom dan menandakan status rekod sebagai **"Perlu Pengesahan Guru"**. Guru mempunyai kuasa penuh dalam panel *Semakan Guru* untuk mengesahkan padanan, memilih murid yang betul jika terdapat lebih daripada seorang, atau membatalkan/memadam rekod berkenaan.

---

## 1. Overview & Core Concept

* **Tujuan Utama**: Memastikan murid yang mengakses pautan Google Classroom dapat disahkan identiti mereka dengan pantas dan tepat berdasarkan senarai kelas (*Google Classroom Roster*).
* **Sasaran Pengguna**: Murid sekolah (menggunakan akaun DELIMa atau peranti peribadi) dan Guru mata pelajaran yang menguruskan tugasan Google Classroom.
* **Nilai Tambah**: 
  1. Menghapuskan kekeliruan markah apabila murid menaip nama samaran atau nama pendek.
  2. Memudahkan guru memadankan rekod murid secara satu klik sebelum markah disegerakkan (*synced*) ke Google Classroom.
  3. Mengelakkan rekod berganda atau nama bertindih melalui kawalan pemilihan pintar oleh guru.

---

## 2. User Experience & Visual Design

### A. Aliran Pengguna Murid (Student Experience)
1. **Langkah 1: Pengesanan Akaun Automatik**:
   * Pautan Google Classroom (`/?qid=SQ-XXXX&courseId=...&courseWorkId=...`) dibuka.
   * Sistem membaca akaun Google aktif dalam sesi pelayar.
   * Jika tiada sesi aktif, butang *"Log Masuk Akaun Google"* dipaparkan dengan reka bentuk mesra murid.
2. **Langkah 2: Kad Profil Pengesahan Penuh ("Adakah Ini Nama Anda?")**:
   * Sistem memadankan e-mel/nama akaun dengan senarai nama berdaftar dalam Google Classroom kelas tersebut.
   * Dipaparkan kad profil bersih berlatarbelakangkan warna lembut (Emerald/Blue):
     * Avatar profil murid
     * Nama Penuh Rasmi (dari Google Classroom Roster)
     * E-Mel Akaun & Nama Kelas
     * Teks pengesahan: *"Adakah ini nama anda?"*
     * Dua butang tindakan:
       * 🟢 **Pasti, Mula Menjawab** (Meneruskan terus ke soalan interaktif dan mengikat rekod markah)
       * ⚪ **Bukan / Taip Nama Manual** (Membuka kotak input nama jika nama berbeza)
3. **Langkah 3: Input Manual & Padanan Pintar (Fuzzy Matching)**:
   * Sekiranya murid menaip nama pendek (contoh: *"Ali"* sedangkan nama rasmi *"MUHAMMAD ALI BIN HASSAN"*), sistem mengesan nama berhampiran dalam senarai Classroom.
   * Markah dihantar dengan status `Perlu Pengesahan Guru` berserta cadangan nama padanan Google Classroom.

### B. Aliran Pengguna Guru (Teacher Dashboard / Semakan Guru)
1. **Lencana Status Pintar pada Jadual Markah**:
   * Status **"Perlu Pengesahan"** (latar jingga lembut) dipaparkan sekiranya nama murid dimasukkan secara manual atau nama pendek.
2. **Dialog Pemadanan Murid (Match Resolver Modal)**:
   * Apabila guru menekan nama murid berkenaan:
     * Senarai calon murid Google Classroom yang sepadan dipaparkan mengikut skor padanan (contoh: 90% sepadan).
     * Jika terdapat 2 atau lebih murid bernama serupa (contoh: dua orang bernama "Ahmad"), guru boleh memilih murid sasaran yang betul.
     * Terdapat butang tindakan:
       * 🔵 **Sahkan Sebagai [Nama Rasmi Classroom]**
       * 🔴 **Buang / Padam Rekod Murid Ini**
   * Selepas disahkan, nama murid dikemas kini kepada nama rasmi dan status sync ke Google Classroom dibuka.

---

## 3. Key Product Decisions & Trade-Offs

* **Keputusan 1: Padanan Roster Server + Client Caching**
  * *Pendekatan*: Memuat turun senarai nama murid kelas (*Classroom Students Roster*) sekali sahaja dan menyimpan dalam cache sesi bagi mengelakkan had kuota API Google Classroom (*rate limiting*).
  * *Sebab*: Memastikan proses pengesanan nama murid berlaku sepantas kilat (<200ms) tanpa kelewatan rangkaian.
* **Keputusan 2: Algoritma Padanan Fleksibel (Token Set / Levenshtein Distance)**
  * *Pendekatan*: Menggunakan padanan perkataan (subset perkataan nama) dan padanan fonetik asas. Contohnya, input *"DANISH"* akan sepadan dengan *"MUHAMMAD DANISH HAIKAL BIN ROSLI"*.
  * *Sebab*: Murid Malaysia lazimnya hanya menaip nama panggilan atau nama pertama tanpa "Bin/Binti".
* **Keputusan 3: Pengasingan Mod Tugasan Umum vs Google Classroom**
  * *Pendekatan*: Pautan Tugasan Umum (`mod=umum`) kekal bebas tanpa akaun Google, manakala pautan yang dijana khas untuk Classroom mengaktifkan aliran pengesahan roster ini secara automatik.
  * *Sebab*: Menjaga fleksibiliti guru yang ingin berkongsi kuiz secara umum tanpa mengganggu ketepatan markah kelas Google Classroom.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ALIRAN PENGESAHAN MURID CLASSROOM                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    Buka Link Tugasan GC       │
                      │ (?qid=SQ-1&courseId=..&mod=gc)│
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ Semak Sesi Google / DELIMa    │
                      └───────┬───────────────┬───────┘
                     (Jumpa)  │               │ (Tiada Sesi)
                              │               ▼
                              │    ┌─────────────────────┐
                              │    │ Log Masuk Google    │
                              │    └──────────┬──────────┘
                              │               │
                              ▼               ▼
                      ┌───────────────────────────────┐
                      │ Tarik Roster Kelas Google CR  │
                      │ (/api/classroom/students)     │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │   Adakah E-mel/Nama Sepadan?  │
                      └───────┬───────────────┬───────┘
                     (Padan)  │               │ (Tidak / Nama Pendek)
                              │               ▼
                              │    ┌───────────────────────────┐
                              │    │ Algoritma Fuzzy Matching  │
                              │    │ Cari calon murid terdekat │
                              │    └──────────┬────────────────┘
                              │               │
                              ▼               ▼
                      ┌────────────────────────────────────────┐
                      │ Kad Profil: "Adakah ini nama anda?"    │
                      │ [ ✅ PASTI ]     [ ✏️ TAIP MANUAL ]    │
                      └───────────────────────┬────────────────┘
                                              │
                                              ▼
                                 Mula Menjawab Soalan
                                              │
                                              ▼
                                 Hantar Markah Murid
                   (Status: "Selesai" ATAU "Perlu Pengesahan Guru")
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │ Dashboard Semakan Guru:   │
                                │ • Guru Sahkan Murid       │
                                │ • Pilih Murid (Jika >1)   │
                                │ • Buang / Padam Rekod     │
                                └───────────────────────────┘
```

### Entiti Data & Skema Tambahan
1. **Submissions (Firestore & Google Sheets 'Markah Murid')**:
   * `email`: E-mel murid yang dikesan (jika ada).
   * `nama`: Nama yang dimasukkan murid semasa menjawab.
   * `matchedClassroomName`: Cadangan nama murid rasmi dari Google Classroom.
   * `matchedStudentId`: ID murid dalam Google Classroom.
   * `verificationStatus`: `'verified'` | `'pending_teacher_approval'` | `'conflict'`.
   * `courseId` & `courseWorkId`: Pengenalpasti tugasan Google Classroom.

2. **Endpoints Pelayan Tambahan**:
   * `GET /api/classroom/students?courseId=...`: Mengambil senarai murid berdaftar dalam kelas.
   * `POST /api/verify-student-submission`: Endpoint bagi guru mengesahkan padanan nama murid atau memadam rekod konflik.

---

## Langkah Pelaksanaan & Status Terkini (Selesai Sepenuhnya)

1. **Pembaikan Masalah Header di Atas Popup Modal**:
   - [x] Punca utama dikenal pasti: `<div className="flex flex-col h-full bg-slate-50 relative z-0 pb-10">` dalam `BankSoalan.tsx` telah memerangkap modal popup ke dalam stacking context bernilai `z-0`, menyebabkannya berada di bawah header utama (`z-20`) dan panel navigasi dwi-mod (`z-30`).
   - [x] Dibuang `relative z-0` daripada pembungkus utama `BankSoalan.tsx`.
   - [x] Menggunakan React Portal `createPortal(..., document.body)` berserta `z-[9999]` bagi semua popup modal (Modal Tugasan Umum, Modal Hantar ke Google Classroom, Modal Pratonton Soalan, dan Modal Pautan WhatsApp) serta modal pengesahan padanan guru di `SemakanGuru.tsx`. Ini menjamin 100% bahawa tetingkap modal sentiasa berada di lapisan paling hadapan dan tidak lagi tertindih di bawah sebarang header.

2. **Pengesanan Akaun Google Bukan MOE (Akaun Personal / @gmail)**:
   - [x] Sistem kini mengimbas storan setempat (`localStorage`) bagi semua rekod pengesahan Google Chrome (termasuk `firebase:authUser:*`, `known_personal_accounts`, dan `known_student_accounts`) serta mengimbas pangkalan data Chrome IndexedDB (`firebaseLocalStorageDb`).
   - [x] Akaun bukan MOE (seperti akaun peribadi murid atau akaun ibu bapa `@gmail.com`) dikesan secara automatik dan disenaraikan untuk pilihan murid.
   - [x] Keutamaan paparan kekal teratur: Akaun MOE DELIMa (`⭐ MOE (Disyorkan)`) diutamakan di baris teratas dengan warna hijau lembut, manakala akaun Google peribadi (`👤 Google Personal`) dipaparkan kemas dengan lencana biru lembut.
   - [x] Murid boleh terus memilih mana-mana akaun (MOE atau Personal) tanpa perlu log masuk popup Google semula untuk memulakan soalan interaktif.
   - [x] Markah murid direkodkan terus mengikut identiti akaun yang dipilih secara live ke dalam pangkalan data dan Google Sheets.

3. **UI Tugasan Umum Semakan Guru**:
   - [x] "Senarai Tugasan Umum Telah Dijana" (Bahagian 1) diletakkan di bahagian atas dengan butang WhatsApp hijau (`bg-[#25D366]`) berformat kemas.
   - [x] Bahagian dipisahkan dengan jelas antara Bahagian 1 (Pengurusan Tugasan) dan Bahagian 2 (Rekod & Keputusan Markah Pelajar).

4. **Kad Soalan Bank Soalan**:
   - [x] Dinamakan semula kepada "Tugasan Umum".
   - [x] Butang "Pratonton Soalan" dan "Link Soalan" disusun bersebelahan dalam baris yang sama (`grid grid-cols-2 gap-2`).
   - [x] Pengepala gradient ungu lembut mengikut Bab terendah ke tertinggi dikekalkan.
