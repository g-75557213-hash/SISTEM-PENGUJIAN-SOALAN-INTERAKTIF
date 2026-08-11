const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldPromptText = `Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu fail HTML simulasi interaktif menggunakan HTML, Tailwind CSS (melalui CDN), dan JavaScript tulen (Vanilla JS) dalam SATU fail HTML yang lengkap untuk menggantikan eksperimen fizikal ini.

Keperluan Simulasi:
1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.
2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.
3. Animasi: Tambah animasi yang bersesuaian (gunakan inline CSS animation, atau Tailwind transitions) untuk menampakkan proses eksperimen berjalan.
4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.
5. Lengkap & Berfungsi: Pastikan kod komponen dilarikan dalam SATU fail HTML (Single File HTML). Kod mesti komprehensif, tidak terlalu ringkas. Jangan beri "placeholder" code. Semua CSS dan JS mesti di dalam fail HTML yang sama.`;

const newPromptText = `Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu fail HTML simulasi interaktif menggunakan HTML, Tailwind CSS (melalui CDN), dan JavaScript tulen (Vanilla JS) dalam SATU fail HTML yang lengkap untuk menggantikan eksperimen fizikal ini.

Keperluan Simulasi:
1. Senarai Radas & Prosedur: Paparkan senarai bahan dan radas, serta prosedur / aturcara pengendalian eksperimen sama seperti eksperimen sebenar.
2. Logik Realistik: Masukkan formula atau logik fizik, kimia atau biologi yang tepat untuk memberikan keputusan.
3. Interaktif & Gamifikasi: Bina UI canggih, butang, slider (cth: untuk laraskan ketinggian/isipadu), dan input untuk pembolehubah manipulasi (PM). Gunakan tema 'dark mode' dan komponen UI modern.
4. Animasi: Tambah animasi interaktif (gunakan inline CSS animation atau Tailwind transitions) untuk menunjukkan proses eksperimen sedang berlaku dengan lancar.
5. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod pemerhatian (PB) bagi sekurang-kurangnya 3 percubaan (purata) secara automatik/interaktif.
6. Lengkap: Semua kod mestilah di dalam SATU fail HTML (Single File HTML) tanpa "placeholder" code.`;

code = code.replace(oldPromptText, newPromptText).replace(oldPromptText.replace(/\n/g, '\\n'), newPromptText.replace(/\n/g, '\\n')).replace(oldPromptText.replace(/\n/g, '<br/>\n'), newPromptText.replace(/\n/g, '<br/>\n'));

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log("Patched Prompt!");
