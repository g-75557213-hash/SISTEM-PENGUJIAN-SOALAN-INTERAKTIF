# Pelan Pelaksanaan: Modul Pengesahan Nama Murid Tugasan Umum (Dengan Ekstrak Nama Akaun Google)

Memastikan bahawa bagi **Tugasan Umum SAHAJA**:
1. System **WAJIB memaparkan borang pengesahan murid** (NAMA PENUH & KELAS) sebelum membenarkan murid menjawab soalan.
2. Jika browser/Chrome tersebut mempunyai akaun Google yang terlog masuk, sistem akan **mengekstrak nama akaun tersebut secara automatik** dan memasukkannya ke dalam ruangan *input* nama (dalam **HURUF BESAR**) sebagai cadangan awal.
3. Murid masih **mesti menyemak / menyunting nama tersebut** dan menekan butang *"Mula Menjawab Tugasan ➔"* untuk membuka soalan kuiz.

---

## 1. Gambaran Keseluruhan Aliran Pengguna (UX Flow)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Murid Buka Link Tugasan Umum                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Sistem Mengesan Akaun Google/Chrome (Jika Ada)           │
│         Extract Name -> Tukar ke HURUF BESAR (cth: "Ahmad Bin Ali")     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Borang Pengesahan Murid (SENTIASA PAPAR)                │
│                                                                        │
│   🎓 MOD UMUM • TIADA LOG MASUK DIPERLUKAN                             │
│   ------------------------------------------------                  │
│   NAMA PENUH (HURUF BESAR) *                                           │
│   [ AHMAD BIN ALI                                        ] (Pre-filled)│
│                                                                        │
│   KELAS *                                                              │
│   [ 1 ABU BAKAR                                          ]             │
│                                                                        │
│   [ Mula Menjawab Tugasan ➔ ]                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Soalan Kuiz Dibuka                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Perubahan Spesifik Mengikut Komponen

### A. Google Apps Script (`Code.gs` & `src/App.tsx`)
1. **Pengesanan Akaun Google dalam `doGet`**:
   - Apabila `isUmumMode` diaktifkan (`mod === "umum"` atau kod bermula `TU-`), sistem tetap cuba mengekstrak `activeEmail` & `userName` daripada `Session.getActiveUser().getEmail()` / Google Profile jika wujud.
   - Nilai `userName` ditukar kepada **HURUF BESAR** dan dimasukkan ke dalam `window.USER_NAME`.

2. **Jaminan Paparan Modal (`delima-login-popup`)**:
   - Bagi `window.IS_UMUM`, modal pengesahan murid **SENTIASA DIJANA DAN DIPAPARKAN** (ia tidak pernah dilangkau secara automatik).
   - Petak `#input-nama` akan **diisi secara automatik (pre-fill)** dengan `window.USER_NAME` (jika sistem berjaya mengekstrak nama daripada akaun Chrome/Google), tetapi murid masih boleh menyuntingnya.
   - Petak `#input-kelas` diisi dengan `window.KELAS` jika ada dalam pautan.
   - Apabila murid menekan butang *"Mula Menjawab Tugasan ➔"*, nama & kelas yang disahkan akan dihantar dan modal dibuka.

### B. Komponen Paparan Web (`src/components/StudentView.tsx`)
1. Apabila pautan dibuka di dalam aplikasi web:
   - Jika pengguna terlog masuk dengan akaun Google (`user`), `publicNama` akan pra-isi `user.displayName?.toUpperCase()`.
   - Modul `isPublicStarted` kekal `false` pada permulaan, supaya borang *"Pengesahan Murid"* **sentiasa memaparkan pop-up borang masukan nama** kepada murid.
   - Murid menekan butang *"Mula Menjawab Tugasan ➔"* untuk memulakan soalan.

---

## 3. Langkah Demi Langkah Pelaksanaan

1. **Kemaskini `Code.gs` & `src/App.tsx` (`appsScriptCode`)**:
   - Aktifkan semula ekstrak nama Google account dalam `doGet` untuk Tugasan Umum.
   - Kemaskini modal JavaScript `window.IS_UMUM` untuk memasukkan `window.USER_NAME` sebagai nilai `value` pada `#input-nama`.
2. **Kemaskini `src/components/StudentView.tsx`**:
   - Pra-isi `publicNama` dengan `user.displayName?.toUpperCase()` jika wujud, tetapi kekalkan borang modal sebagai paparan wajib sebelum kuiz dimula.
3. **Pengesahan & Ujian Build**:
   - Jalankan `lint_applet` dan `compile_applet`.
   - Restart dev server.
