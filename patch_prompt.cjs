const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldPromptText = `Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu komponen simulasi interaktif menggunakan React (TSX) dan Tailwind CSS untuk menggantikan eksperimen fizikal ini.

Keperluan Simulasi:
1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.
2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.
3. Animasi: Tambah animasi yang bersesuaian (gunakan inline CSS animation, transisi Tailwind, atau Framer Motion jika perlu) untuk menampakkan proses eksperimen berjalan (contoh: cecair bertukar warna, graf bergerak, dsb).
4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.
5. Lengkap & Berfungsi: Pastikan kod komponen dilarikan dalam satu fail (Single File Component) tanpa bergantung kepada komponen luar (kecuali icon lucide-react). Kod mesti komprehensif, tidak terlalu ringkas. Jangan beri "placeholder" code.`;

const newPromptText = `Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu fail HTML simulasi interaktif menggunakan HTML, Tailwind CSS (melalui CDN), dan JavaScript tulen (Vanilla JS) dalam SATU fail HTML yang lengkap untuk menggantikan eksperimen fizikal ini.

Keperluan Simulasi:
1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.
2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.
3. Animasi: Tambah animasi yang bersesuaian (gunakan inline CSS animation, atau Tailwind transitions) untuk menampakkan proses eksperimen berjalan.
4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.
5. Lengkap & Berfungsi: Pastikan kod komponen dilarikan dalam SATU fail HTML (Single File HTML). Kod mesti komprehensif, tidak terlalu ringkas. Jangan beri "placeholder" code. Semua CSS dan JS mesti di dalam fail HTML yang sama.`;

code = code.replace(oldPromptText, newPromptText).replace(oldPromptText.replace(/\n/g, '<br/>\n'), newPromptText.replace(/\n/g, '<br/>\n'));

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
