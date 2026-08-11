const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// 1. Add state for custom HTML
const stateAnchor = `  const [activeForm, setActiveForm] = useState<string>('Tingkatan 1');`;
code = code.replace(stateAnchor, stateAnchor + `\n  const [customHTML, setCustomHTML] = useState('');\n  const [simForm, setSimForm] = useState({ tingkatan: 'Tingkatan 1', tajuk: '' });\n  const [isSaving, setIsSaving] = useState(false);\n  const iframeRef = useRef<HTMLIFrameElement>(null);`);

// 2. Add Save function
const saveFunction = `
  const handleSaveSimulasi = async () => {
    if (!customHTML.trim() || !simForm.tajuk.trim()) {
      alert('Sila masukkan tajuk dan kod simulasi');
      return;
    }
    setIsSaving(true);
    try {
      const newSim = {
        timestamp: new Date().toISOString(),
        namaGuru: userName || userEmail || 'Guru',
        tingkatan: simForm.tingkatan,
        tajuk: simForm.tajuk,
        kodReact: customHTML,
        idSimulasi: 'SIM-' + Date.now()
      };
      await onSaveToBank(newSim);
      alert('Simulasi berjaya disimpan!');
      setCustomHTML('');
      setSimForm({ tingkatan: 'Tingkatan 1', tajuk: '' });
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan simulasi');
    }
    setIsSaving(false);
  };
`;
const insertBeforeRenderCipta = `  // Render Logic for Gamification Setup`;
code = code.replace(insertBeforeRenderCipta, saveFunction + '\n' + insertBeforeRenderCipta);

// 3. Update Cipta UI
const ciptaUIRegex = /<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8">[\s\S]*?<\/div>\s*<\/div>\s*\);\s*};/;

const newCiptaUI = `<div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 space-y-6">
              <h2 className="text-xl font-bold text-cyan-300 border-b border-slate-800 pb-3">Bina Simulasi AI (Gemini)</h2>
              <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-3">
                    <p className="text-sm text-slate-300">
                      Gunakan Gemini untuk menukar gambar / prosedur eksperimen fizikal kepada aplikasi simulasi interaktif.
                    </p>
                    <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-2">
                       <li>Buka <a href="https://gemini.google.com" target="_blank" className="text-blue-400 hover:underline">gemini.google.com</a></li>
                       <li>Muat naik gambar eksperimen / radas</li>
                       <li>Salin prompt di sebelah dan tampal ke dalam Gemini</li>
                       <li>Salin kod HTML yang dijana dan tampal di bawah</li>
                    </ol>
                  </div>
              </div>
            </div>
               
            <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col relative">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400"/> Prompt AI (Sedia untuk disalin)</h3>
                  <button onClick={() => {
                     const promptText = \`Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu fail HTML simulasi interaktif menggunakan HTML, Tailwind CSS (melalui CDN), dan JavaScript tulen (Vanilla JS) dalam SATU fail HTML yang lengkap untuk menggantikan eksperimen fizikal ini.\\n\\nKeperluan Simulasi:\\n1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.\\n2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.\\n3. Animasi: Tambah animasi yang bersesuaian (gunakan inline CSS animation, atau Tailwind transitions) untuk menampakkan proses eksperimen berjalan.\\n4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.\\n5. Lengkap & Berfungsi: Pastikan kod komponen dilarikan dalam SATU fail HTML (Single File HTML). Kod mesti komprehensif, tidak terlalu ringkas. Jangan beri "placeholder" code. Semua CSS dan JS mesti di dalam fail HTML yang sama.\`;
                     navigator.clipboard.writeText(promptText);
                     alert('Prompt disalin ke clipboard!');
                  }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg">Salin Prompt</button>
               </div>
               
               <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[150px]">
Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu fail HTML simulasi interaktif menggunakan HTML, Tailwind CSS (melalui CDN), dan JavaScript tulen (Vanilla JS) dalam SATU fail HTML yang lengkap untuk menggantikan eksperimen fizikal ini.<br/><br/>

Keperluan Simulasi:<br/>
1. Logik Realistik: Masukkan logik fizik, kimia atau biologi yang tepat.<br/>
2. Interaktif & Gamifikasi: Bina UI yang menarik, butang, slider, input untuk pembolehubah manipulasi. Gunakan 'dark mode' dan elemen glassmorphism.<br/>
3. Animasi: Tambah animasi yang bersesuaian.<br/>
4. Jadual Keputusan: Sediakan jadual untuk memaparkan dan merekod sekurang-kurangnya 3 percubaan secara interaktif.<br/>
5. Lengkap & Berfungsi: Pastikan kod dilarikan dalam SATU fail HTML (Single File HTML). Jangan beri "placeholder" code. Semua CSS dan JS mesti di dalam fail HTML yang sama.
               </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Uji & Simpan Simulasi</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Tingkatan</label>
                    <select value={simForm.tingkatan} onChange={e => setSimForm({...simForm, tingkatan: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none">
                      <option value="Tingkatan 1">Tingkatan 1</option>
                      <option value="Tingkatan 2">Tingkatan 2</option>
                      <option value="Tingkatan 3">Tingkatan 3</option>
                      <option value="Tingkatan 4">Tingkatan 4</option>
                      <option value="Tingkatan 5">Tingkatan 5</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Tajuk Eksperimen</label>
                    <input type="text" value={simForm.tajuk} onChange={e => setSimForm({...simForm, tajuk: e.target.value})} placeholder="Cth: Ketumpatan Air" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block flex justify-between">
                    <span>Tampal Kod HTML dari Gemini Di Sini</span>
                    <button onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setCustomHTML(text);
                      } catch (err) {
                        alert('Gagal membaca clipboard. Sila paste (Ctrl+V) secara manual.');
                      }
                    }} className="text-blue-400 hover:text-blue-300">Paste Kod</button>
                  </label>
                  <textarea 
                    value={customHTML} 
                    onChange={e => setCustomHTML(e.target.value)} 
                    placeholder="<!DOCTYPE html>\n<html>\n..." 
                    className="w-full h-[300px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-emerald-400 font-mono text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                  />
                </div>
                <button onClick={handleSaveSimulasi} disabled={isSaving || !customHTML.trim() || !simForm.tajuk.trim()} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                  Simpan Simulasi ke Bank Data
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 flex flex-col">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400"/> Pratonton Simulasi</h3>
              <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[400px]">
                {!customHTML.trim() ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                    <MonitorPlay className="w-12 h-12 mb-2 opacity-50"/>
                    <p className="text-sm font-medium">Pratonton akan dipaparkan di sini</p>
                  </div>
                ) : (
                  <iframe 
                    ref={iframeRef}
                    srcDoc={customHTML}
                    className="w-full h-full border-0"
                    title="Simulation Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </div>
            </div>
          </div>
      </div>
    );
  };`;

code = code.replace(ciptaUIRegex, newCiptaUI);
fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
