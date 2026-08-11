const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// 1. Add t4ShowInfo state
const t4StateStr = `  const [t4Results, setT4Results] = useState<{ block: string, dent: number }[]>([]);`;
code = code.replace(t4StateStr, t4StateStr + `\n  const [t4ShowInfo, setT4ShowInfo] = useState(false);`);

// 2. Replace T4 UI
const oldT4UI = `{selectedApp === 'sim_aloi' && (
             <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[600px]">
                <div className="w-full md:w-1/3 space-y-6">
                   <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                   <h2 className="text-xl font-bold text-slate-300 border-b border-slate-800 pb-3">Eksperimen Kekerasan Aloi (T4)</h2>
                   <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-300">Pilih Jenis Bongkah (PM):</label>
                      <div className="flex gap-2">
                         <button onClick={() => setT4Block('Kuprum')} className={\`flex-1 py-2 rounded-lg text-sm font-bold transition-all \${t4Block === 'Kuprum' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}\`}>Kuprum</button>
                         <button onClick={() => setT4Block('Gangsa')} className={\`flex-1 py-2 rounded-lg text-sm font-bold transition-all \${t4Block === 'Gangsa' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400'}\`}>Gangsa</button>
                      </div>
                      <button onClick={runT4Experiment} disabled={t4Animating} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg disabled:opacity-50">JATUHKAN PEMBERAT (1KG)</button>
                   </div>
                   {t4Results.length > 0 && (
                     <div className="mt-6">
                       <table className="w-full text-sm text-left text-slate-300 border border-slate-800">
                          <thead className="bg-slate-800 text-xs uppercase"><tr><th className="px-3 py-2 border border-slate-700">Jenis</th><th className="px-3 py-2 border border-slate-700">Lekuk (cm)</th></tr></thead>
                          <tbody>{t4Results.map((r, i) => <tr key={i}><td className="px-3 py-2 border border-slate-700">{r.block}</td><td className="px-3 py-2 border border-slate-700">{r.dent.toFixed(1)}</td></tr>)}</tbody>
                       </table>
                     </div>
                   )}
                </div>
                <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex justify-center items-end relative overflow-hidden h-[500px]">
                   <div className="relative w-64 h-full flex flex-col items-center justify-end pb-10">
                      <div className={\`w-16 h-16 bg-slate-400 absolute flex items-center justify-center font-bold text-slate-800 \${t4Animating ? 'animate-drop-weight' : 'top-10'}\`} style={{ top: t4Animating ? undefined : '40px' }}>1 KG</div>
                      <div className="absolute top-0 bottom-24 w-1 bg-slate-800/50 -z-10 border-l border-dashed border-slate-600" />
                      <div className="w-8 h-8 rounded-full bg-slate-300 relative mt-auto mb-1" />
                      <div className={\`w-40 h-24 relative flex items-center justify-center \${t4Block === 'Kuprum' ? 'bg-orange-800' : 'bg-yellow-800'}\`}>
                         {t4Dent && !t4Animating && <div className="absolute top-0 w-8 h-2 bg-black/60 rounded-full" style={{ transform: \`scaleX(\${t4Dent / 2.5})\` }} />}
                      </div>
                   </div>
                   <style>{\`@keyframes drop-weight { 0% { top: 40px; } 90% { top: calc(100% - 150px); } 100% { top: calc(100% - 150px); } } .animate-drop-weight { animation: drop-weight 1s cubic-bezier(0.5, 0, 1, 1) forwards; }\`}</style>
                </div>
             </div>
          )}`;

const newT4UI = `{selectedApp === 'sim_aloi' && (
             <div className="flex flex-col gap-6 w-full relative z-10">
               {/* Concept Explanation Modal/Overlay */}
               {t4ShowInfo && (
                 <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                   <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 md:p-8 relative">
                     <button onClick={() => setT4ShowInfo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full">✕</button>
                     <h3 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-400"/> Konsep & Penerangan</h3>
                     <div className="space-y-4 text-sm text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <h4 className="font-bold text-orange-400 mb-2 border-b border-slate-800 pb-2">Pernyataan Masalah</h4>
                           <p>Adakah aloi lebih keras berbanding logam tulennya?</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <h4 className="font-bold text-blue-400 mb-2 border-b border-slate-800 pb-2">Pemboleh Ubah</h4>
                           <ul className="list-disc pl-5 space-y-1">
                             <li><strong>Dimanipulasikan (PM):</strong> Jenis bongkah (Kuprum atau Gangsa)</li>
                             <li><strong>Bergerak Balas (PB):</strong> Diameter lekuk pada bongkah</li>
                             <li><strong>Dimalarkan (PDM):</strong> Jisim pemberat, ketinggian pemberat jatuh, saiz bebola keluli</li>
                           </ul>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <h4 className="font-bold text-purple-400 mb-2 border-b border-slate-800 pb-2">Hipotesis</h4>
                           <p>Bongkah gangsa (aloi) lebih keras berbanding bongkah kuprum (logam tulen) menyebabkan diameter lekuk pada bongkah gangsa lebih kecil.</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <h4 className="font-bold text-emerald-400 mb-2 border-b border-slate-800 pb-2">Inferens & Konsep</h4>
                           <p>Kuprum (Logam Tulen) terdiri daripada atom yang bersaiz sama dan tersusun teratur. Apabila daya dikenakan, lapisan atom mudah menggelongsor di atas satu sama lain menjadikannya kurang keras.</p>
                           <p className="mt-2">Gangsa (Aloi) terdiri daripada campuran atom berbeza saiz (Kuprum dan Stanum). Kehadiran atom berbeza saiz mengganggu susunan teratur atom kuprum, menghalang lapisan atom daripada menggelongsor. Ini menjadikannya lebih keras.</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <h4 className="font-bold text-pink-400 mb-2 border-b border-slate-800 pb-2">Definisi Secara Operasi (DSO) Kekerasan</h4>
                           <p>Kekerasan aloi / logam tulen ditunjukkan oleh diameter lekuk yang terhasil pada permukaan bongkah apabila pemberat 1kg dijatuhkan ke atas bebola keluli.</p>
                        </div>
                     </div>
                   </div>
                 </div>
               )}

               <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[600px]">
                  <div className="w-full md:w-1/3 space-y-6">
                     <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                     <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h2 className="text-xl font-bold text-slate-300">Eksperimen Kekerasan Aloi (T4)</h2>
                        <button onClick={() => setT4ShowInfo(true)} className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/50 shadow-sm flex items-center gap-1"><Eye className="w-3 h-3"/> Info & Konsep</button>
                     </div>
                     
                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 block">1. Pilih Jenis Bongkah (PM):</label>
                        <div className="flex gap-2">
                           <button onClick={() => setT4Block('Kuprum')} className={\`flex-1 py-3 rounded-lg text-sm font-bold transition-all \${t4Block === 'Kuprum' ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>
                              Bongkah Kuprum
                              <div className="text-[10px] font-normal opacity-80 mt-1">(Logam Tulen)</div>
                           </button>
                           <button onClick={() => setT4Block('Gangsa')} className={\`flex-1 py-3 rounded-lg text-sm font-bold transition-all \${t4Block === 'Gangsa' ? 'bg-yellow-600 text-white shadow-[0_0_15px_rgba(202,138,4,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>
                              Bongkah Gangsa
                              <div className="text-[10px] font-normal opacity-80 mt-1">(Aloi)</div>
                           </button>
                        </div>
                     </div>

                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <button onClick={runT4Experiment} disabled={t4Animating} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1">
                           <span className="flex items-center gap-2">JATUHKAN PEMBERAT (1 KG)</span>
                           <span className="text-[10px] font-normal opacity-80">Tinggi tetap: 50cm</span>
                        </button>
                     </div>

                     <div className="text-xs text-slate-500 italic bg-slate-900 p-3 rounded-lg border border-slate-800 text-center">
                        <span className="font-bold text-slate-400">Arahan:</span> Pilih bongkah dan jatuhkan pemberat untuk merekodkan diameter lekuk. Bandingkan diameter lekuk antara kedua-dua bongkah.
                     </div>
                  </div>
                  
                  <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex justify-center items-end relative overflow-hidden h-[500px]">
                     {/* Scale markings */}
                     <div className="absolute left-10 top-10 bottom-24 w-8 border-r-2 border-slate-700 flex flex-col justify-between py-4 text-[10px] font-mono text-slate-500 text-right pr-2">
                        <span>50cm</span>
                        <span>40cm</span>
                        <span>30cm</span>
                        <span>20cm</span>
                        <span>10cm</span>
                        <span>0cm</span>
                     </div>
                     
                     <div className="relative w-64 h-full flex flex-col items-center justify-end pb-10 z-10">
                        {/* Weight */}
                        <div className={\`w-20 h-20 bg-gradient-to-br from-slate-300 to-slate-500 absolute flex flex-col items-center justify-center font-bold text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.5)] border-b-4 border-slate-600 rounded-sm \${t4Animating ? 'animate-drop-weight' : 'top-[10%]'}\`} style={{ top: t4Animating ? undefined : '10%' }}>
                           <span className="text-xl">1 KG</span>
                           <span className="text-[8px] opacity-70">Pemberat</span>
                        </div>
                        
                        {/* Drop guide line */}
                        <div className="absolute top-[10%] bottom-28 w-px bg-slate-800/50 -z-10 border-l-2 border-dashed border-slate-600/50" />
                        
                        {/* Steel Ball */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-400 relative mt-auto mb-1 shadow-[inset_-2px_-2px_10px_rgba(0,0,0,0.5),0_5px_10px_rgba(0,0,0,0.5)] flex items-center justify-center z-20">
                           <div className="w-2 h-2 bg-white/60 rounded-full absolute top-1 left-1 blur-[1px]"></div>
                        </div>
                        
                        {/* Block */}
                        <div className={\`w-48 h-24 relative flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-t-2 border-white/20 transition-colors duration-500 rounded-sm \${t4Block === 'Kuprum' ? 'bg-gradient-to-br from-orange-600 to-orange-900' : 'bg-gradient-to-br from-yellow-600 to-yellow-900'}\`}>
                           {/* Highlight */}
                           <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
                           
                           {/* Dent Visualization */}
                           {t4Dent && !t4Animating && (
                              <div className="absolute top-0 w-8 h-2 bg-black/80 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-visible" style={{ transform: \`scaleX(\${t4Dent / 2.5})\` }}>
                                 {/* Dent diameter label */}
                                 <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap border border-slate-600 animate-fade-in-up shadow-lg">
                                    {t4Dent.toFixed(1)} cm
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45"></div>
                                 </div>
                              </div>
                           )}
                           
                           {/* Label on block */}
                           <div className="absolute bottom-2 right-3 text-white/40 font-bold text-sm tracking-wider uppercase">
                              {t4Block}
                           </div>
                        </div>
                        
                        {/* Table base */}
                        <div className="absolute -bottom-4 w-96 h-4 bg-slate-800 rounded-full blur-[2px]"></div>
                     </div>
                     <style>{\`
                        @keyframes drop-weight { 
                           0% { top: 10%; transform: scale(1); } 
                           90% { top: calc(100% - 150px); transform: scale(1); } 
                           95% { top: calc(100% - 145px); transform: scaleY(0.9); }
                           100% { top: calc(100% - 150px); transform: scale(1); } 
                        } 
                        .animate-drop-weight { 
                           animation: drop-weight 1s cubic-bezier(0.5, 0, 0.9, 1) forwards; 
                        }
                     \`}</style>
                  </div>
               </div>
               
               {/* T4 Results Table */}
               {t4Results.length > 0 && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 animate-fade-in-up">
                     <h3 className="text-lg font-bold text-white mb-4">Jadual Keputusan Eksperimen</h3>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300 border border-slate-700">
                           <thead className="bg-slate-800 text-slate-200">
                              <tr>
                                 <th className="px-4 py-3 border border-slate-700">Set</th>
                                 <th className="px-4 py-3 border border-slate-700">Jenis Bongkah (PM)</th>
                                 <th className="px-4 py-3 border border-slate-700">Kategori</th>
                                 <th className="px-4 py-3 border border-slate-700">Diameter Lekuk, cm (PB)</th>
                              </tr>
                           </thead>
                           <tbody>
                              {t4Results.map((r, i) => (
                                 <tr key={i} className="hover:bg-slate-800/50">
                                    <td className="px-4 py-3 border border-slate-700 font-bold text-slate-400">{i + 1}</td>
                                    <td className="px-4 py-3 border border-slate-700 font-bold">{r.block}</td>
                                    <td className="px-4 py-3 border border-slate-700">{r.block === 'Kuprum' ? 'Logam Tulen' : 'Aloi'}</td>
                                    <td className="px-4 py-3 border border-slate-700 font-mono text-emerald-300 font-bold text-lg">{r.dent.toFixed(1)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}
             </div>
          )}`;

if (code.includes(oldT4UI)) {
  code = code.replace(oldT4UI, newT4UI);
  fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
  console.log('Replaced T4 UI successfully!');
} else {
  console.log('Could not find old T4 UI block!');
}
