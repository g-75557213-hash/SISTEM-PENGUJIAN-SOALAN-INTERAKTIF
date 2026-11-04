# Pelan Pelaksanaan: Pengasingan Tegas Data Tugasan Umum Daripada Data Wayground

Analisis imej yang dimuat naik menunjukkan rekod **WAYGROUND** (seperti murid `NUR MOE`, Kod `WG-870581048881`) serta nilai markah `NaN%` telah termasuk ke dalam Jadual Markah Tugasan Umum. Pelan ini bertujuan mengasingkan data Tugasan Umum secara menyeluruh supaya hanya rekod dari pautan Tugasan Umum (kod bermula `TU-` atau berdaftar di tab `TUGASAN UMUM`) yang dipaparkan.

---

## 1. Analisis & Punca Masalah

1. **Penyusupan Data Wayground ke Tugasan Umum:**
   - Dalam fungsi `loadTugasanUmumData()` pada `SemakanGuru.tsx`, carian rekod dari tab `Markah Murid` menganggap sebarang baris tanpa e-mel (`!row.email`) sebagai Tugasan Umum.
   - Disebabkan rekod Wayground juga tidak mempunyai e-mel pelajar Google Classroom, rekod berkod `WG-` dan ber-ID `WAYGROUND` telah diserap ke dalam senarai Tugasan Umum.

2. **Isu Paparan Markah `NaN%`:**
   - Dalam jadual `filteredUmumSubmissions`, penukaran nilai markah yang tidak sah (`"NaN"` atau string tidak nombor) ke `Number(sub.markah)` menghasilkan `NaN`, yang dipaparkan sebagai `NaN%`.

---

## 2. Pelan Penyelesaian & Perubahan

### A. Pengasingan Penapis Data (`src/components/SemakanGuru.tsx`)
- **Penapis Pilihan Rekod Tugasan Umum:**
  - Menetapkan syarat bahawa sesuatu rekod adalah **Tugasan Umum** HANYA JIKA kod uniknya bermula dengan `TU-` ATAU wujud secara sah dalam senarai pautan Tugasan Umum yang dicipta guru.
  - **Pengecualian Mutlak Wayground:** Menapis dan menolak secara tegas sebarang rekod yang mempunyai:
    - Kod bermula `WG-`
    - `qid === 'WAYGROUND'`
    - `tugasan === 'WAYGROUND'` / `bab === 'WAYGROUND'`

### B. Penapisan Pada Laluan Pelayan (`server.ts`)
- Dalam laluan `/api/tugasan-umum-submissions`, pastikan mana-mana rekod penyerahan dengan kod `WG-` atau ID `WAYGROUND` tidak dikembalikan dalam senarai penyerahan umum.

### C. Pembaikan Paparan Markah & Pengendalian `NaN%`
- Dalam jadual `SemakanGuru.tsx` (baris 1144), perkemaskan penukaran markah:
  ```typescript
  const numMark = sub.markah !== null && sub.markah !== undefined ? parseFloat(String(sub.markah).replace('%', '')) : null;
  const mark = (numMark !== null && !isNaN(numMark)) ? numMark : null;
  ```
  - Jika markah adalah `null` atau `NaN`, jadual akan memaparkan lencana kelabu `-` yang kemas dan bukannya `NaN%`.

---

## 3. Langkah Demi Langkah Pelaksanaan

1. **Kemaskini `src/components/SemakanGuru.tsx`**:
   - Kemaskini `loadTugasanUmumData()` untuk menapis dan menolak semua entri berkod `WG-` dan `WAYGROUND`.
   - Kemaskini pemprosesan markah murid dalam jadual Tugasan Umum untuk mengendalikan nilai `NaN` secara selamat.
2. **Kemaskini `server.ts`**:
   - Kemaskini endpoint `/api/tugasan-umum-submissions` untuk mengecualikan rekod `WG-`.
3. **Pengesahan & Ujian Build**:
   - Jalankan `lint_applet` dan `compile_applet`.
   - Muat semula dev server dan sahkan bahawa hanya data Tugasan Umum yang dipaparkan.
