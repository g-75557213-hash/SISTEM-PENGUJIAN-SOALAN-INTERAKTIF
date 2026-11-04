# Pelan Pelaksanaan: Pengesahan Nama Penuh Murid Bagi Tugasan Umum

Memastikan soalan Tugasan Umum (Mod Umum) **SENTIASA** memaparkan borang pengesahan murid yang meminta **NAMA PENUH (HURUF BESAR)** dan **KELAS**, tanpa mengira sama ada peranti/penyemak imbas Chrome tersebut mempunyai akaun Google/Chrome terlog masuk atau menggunakan profil Chrome Guest.

> [!IMPORTANT]
> Perubahan ini adalah **khusus untuk Tugasan Umum sahaja**. Tugasan Google Classroom biasa akan kekal menggunakan pengesahan DELIMa/Google Classroom sedia ada.

---

## 1. Gambaran Keseluruhan & Konsep Utama

- **Masalah:** Apabila beberapa murid menggunakan komputer/Chrome yang sama (atau akaun Chrome Guest yang sama), borang soalan kadang-kadang auto-isi nama murid sebelum ini daripada `localStorage` atau mengesan akaun Chrome semasa.
- **Penyelesaian:** 
  1. Dalam **Mod Tugasan Umum**, pembolehubah nama murid (`publicNama`) **TIDAK AKAN DIBACA daripada `localStorage`** semasa muat mula (*initial load*).
  2. Borang pengesahan murid (*Student Identity Verification Modal*) akan **sentiasa dipaparkan secara mandatori** dengan ruang nama yang **KOSONG (`""`)** setiap kali pautan soalan dibuka.
  3. Pelajar **wajib memasukkan Nama Penuh rasmi dalam HURUF BESAR** dan menekan butang *"Mula Menjawab Tugasan ➔"* untuk memulakan kuiz.

---

## 2. Pengalaman Pengguna (UX) & Aliran Paparan

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Murid Buka Pautan Umum                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Modals Pengesahan Murid (Sentiasa Muncul)               │
│                                                                        │
│   🎓 MOD UMUM • TIADA LOG MASUK DIPERLUKAN                             │
│   ------------------------------------------------                  │
│   NAMA PENUH (HURUF BESAR) *                                           │
│   [   CONTOH: AHMAD BIN ABDULLAH                            ] (Kosong) │
│                                                                        │
│   KELAS *                                                              │
│   [   1 ABU BAKAR                                           ]          │
│                                                                        │
│   [ Mula Menjawab Tugasan ➔ ]                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Soalan Interaktif Dipaparkan                       │
│     (Markah dihantar menggunakan Nama & Kelas yang baru ditaip)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Keputusan Utama & Strategi Teknikal

1. **`src/components/StudentView.tsx`**:
   - Memadamkan auto-fill nama daripada `localStorage` untuk Tugasan Umum.
   - Memastikan `publicNama` sentiasa di-reset kepada string kosong (`""`) setiap kali pautan Tugasan Umum dibuka.
   - Mengekalkan penukaran automatik kepada **HURUF BESAR** semasa murid menaip (`onInput` & `onChange`).

2. **`Code.gs` & `src/App.tsx` (`appsScriptCode`)**:
   - Memastikan dalam `doGet(e)`, jika `isUmumMode` adalah `true`, nilai `userEmail` dan `userName` diset secara tegas kepada string kosong (`""`).
   - Pop-up skrip `delima-login-popup` untuk Tugasan Umum tidak akan mengisi petak `#input-nama` dengan sebarang nilai terdahulu, memastikan petak tersebut sentiasa bersih dan sedia untuk murid baru.

3. **Integriti Penyimpanan Markah:**
   - Markah tetap direkodkan terus ke tab **`Markah Murid`** dalam Google Spreadsheet guru dengan nama penuh murid (HURUF BESAR), kelas, dan `Kod Unik` tugasan.

---

## 4. Pelan Langkah Demi Langkah

1. **Kemaskini `src/components/StudentView.tsx`**:
   - Reset `publicNama = ""` semasa komponen dimuatkan untuk Mod Umum.
2. **Kemaskini `Code.gs` & `src/App.tsx`**:
   - Paksa `userEmail = ""` dan `userName = ""` dalam `doGet` apabila `isUmumMode` diaktifkan.
   - Kemaskini pembinaan HTML pop-up supaya petak nama sentiasa kosong.
3. **Pengesahan & Ujian Build**:
   - Jalankan `lint_applet` dan `compile_applet` untuk memastikan tiada ralat sintaks.
