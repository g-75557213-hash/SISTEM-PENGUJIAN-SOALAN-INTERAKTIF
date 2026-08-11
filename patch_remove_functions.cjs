const fs = require('fs');
const content = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// Find start and end of renderGamificationSetup and renderActiveGameLobby
const startGamification = content.indexOf('const renderGamificationSetup = () => {');
const endActiveGameLobby = content.indexOf('return (', startGamification + 1);
const beforeRender = content.substring(0, startGamification);

const endOfFunctions = content.indexOf('  return (\n    <div className="min-h-screen');

const newFunctions = `  const renderCiptaSimulasi = () => {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 space-y-6">
            <h2 className="text-xl font-bold text-cyan-300 border-b border-slate-800 pb-3">Bina Simulasi AI (Gemini)</h2>
            <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-3">
                  <p className="text-sm text-slate-300">
                    Gunakan Gemini untuk menukar gambar / prosedur eksperimen fizikal kepada aplikasi simulasi interaktif React.
                  </p>
                  <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-2">
                     <li>Buka Google Gemini (<a href="https://gemini.google.com" target="_blank" className="text-blue-400 hover:underline">gemini.google.com</a>)</li>
                     <li>Muat naik gambar eksperimen / radas (seperti gambar dari buku teks)</li>
                     <li>Salin prompt di sebelah dan tampal ke dalam Gemini</li>
                     <li>Salin kod yang dijana dan masukkan ke dalam aplikasi ini</li>
                  </ol>
                </div>
            </div>
          </div>
             
          <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col relative">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400"/> Prompt AI (Sedia untuk disalin)</h3>
                <button onClick={() => {
                   const promptText = \`Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu komponen simulasi interaktif menggunakan React (TSX) dan Tailwind CSS untuk menggantikan eksperimen fizikal ini.

Keperluan Simulasi:
1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.
2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.
3. Animasi: Tambah animasi yang bersesuaian (gunakan inline CSS animation, transisi Tailwind, atau Framer Motion jika perlu) untuk menampakkan proses eksperimen berjalan (contoh: cecair bertukar warna, graf bergerak, dsb).
4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.
5. Lengkap & Berfungsi: Pastikan kod komponen dilarikan dalam satu fail (Single File Component) tanpa bergantung kepada komponen luar (kecuali icon lucide-react). Kod mesti komprehensif, tidak terlalu ringkas. Jangan beri "placeholder" code.\`;
                   navigator.clipboard.writeText(promptText);
                   alert('Prompt disalin ke clipboard!');
                }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg">Salin Prompt</button>
             </div>
             
             <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto flex-1">
Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu komponen simulasi interaktif menggunakan React (TSX) dan Tailwind CSS untuk menggantikan eksperimen fizikal ini.<br/><br/>

Keperluan Simulasi:<br/>
1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.<br/>
2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.<br/>
3. Animasi: Tambah animasi yang bersesuaian (gunakan inline CSS animation, transisi Tailwind, atau Framer Motion jika perlu) untuk menampakkan proses eksperimen berjalan (contoh: cecair bertukar warna, graf bergerak, dsb).<br/>
4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.<br/>
5. Lengkap & Berfungsi: Pastikan kod komponen dilarikan dalam satu fail (Single File Component) tanpa bergantung kepada komponen luar (kecuali icon lucide-react). Kod mesti komprehensif, tidak terlalu ringkas. Jangan beri "placeholder" code.
             </div>
          </div>
      </div>
    );
  };

`;

const afterFunctions = content.substring(endOfFunctions);

let newContent = beforeRender + newFunctions + afterFunctions;
fs.writeFileSync('src/components/LiveGamificationStudio.tsx', newContent);
