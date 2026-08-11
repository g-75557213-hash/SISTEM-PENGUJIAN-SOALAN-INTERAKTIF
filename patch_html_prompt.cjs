const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const regex = /<div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-\[150px\]">[\s\S]*?<\/div>/;

const newHTML = `<div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[150px]">
Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu fail HTML simulasi interaktif menggunakan HTML, Tailwind CSS (melalui CDN), dan JavaScript tulen (Vanilla JS) dalam SATU fail HTML yang lengkap untuk menggantikan eksperimen fizikal ini.<br/><br/>

Keperluan Simulasi:<br/>
1. Senarai Radas & Prosedur: Paparkan senarai bahan dan radas, serta prosedur eksperimen.<br/>
2. Logik Realistik: Masukkan formula fizik, kimia atau biologi yang tepat.<br/>
3. Interaktif & Gamifikasi: Bina UI canggih, butang, slider (cth: laraskan ketinggian), tema 'dark mode'.<br/>
4. Animasi: Tambah animasi interaktif untuk menampakkan proses eksperimen berjalan.<br/>
5. Jadual Keputusan: Rekod pemerhatian bagi sekurang-kurangnya 3 percubaan secara interaktif.<br/>
6. Lengkap & Berfungsi: Semua dilarikan dalam SATU fail HTML. Tiada "placeholder" code.
               </div>`;

code = code.replace(regex, newHTML);
fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log("Patched HTML Prompt block!");
