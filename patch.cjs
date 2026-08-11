const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// 1. Replace the state
const oldState = `  // --- T1 Simulation State (Ketumpatan) ---
  const [t1Obj, setT1Obj] = useState<'Gabus' | 'Besi' | 'Minyak'>('Gabus');
  const [t1State, setT1State] = useState<'initial' | 'dropped'>('initial');

  const runT1Experiment = () => {
    playSound('click');
    setT1State('initial');
    setTimeout(() => { playSound('drop'); setT1State('dropped'); }, 100);
  };`;

const newState = `  // --- T1 Simulation State (Ketumpatan) ---
  type T1DroppedObj = { id: string, name: string, density: number, type: 'gabus' | 'besi' | 'minyak' | 'custom', offsetX: number, color?: string };
  const [t1Dropped, setT1Dropped] = useState<T1DroppedObj[]>([]);
  const [customDensity, setCustomDensity] = useState<number>(1.5);
  const [customName, setCustomName] = useState<string>('Bahan Baru');

  const handleDropItem = (name: string, type: 'gabus' | 'besi' | 'minyak' | 'custom', density: number) => {
    playSound('drop');
    const newItem: T1DroppedObj = { 
      id: String(Date.now()) + Math.random().toString(), 
      name, 
      type, 
      density, 
      offsetX: Math.random() * 100 - 50,
      color: type === 'custom' ? \`hsl(\${Math.random() * 360}, 70%, 50%)\` : undefined 
    };
    setT1Dropped(prev => [...prev, newItem]);
  };

  const resetT1 = () => {
    playSound('click');
    setT1Dropped([]);
  };`;

// 2. Replace the UI
const oldUI = `          {selectedApp === 'sim_ketumpatan' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[500px]">
               <div className="w-full md:w-1/3 space-y-6">
                  <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                  <h2 className="text-xl font-bold text-blue-300 border-b border-slate-800 pb-3">Eksperimen Ketumpatan (T1)</h2>
                  <div className="space-y-4">
                     <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setT1Obj('Gabus'); setT1State('initial'); }} className={\`px-4 py-2 rounded-lg text-sm font-bold \${t1Obj === 'Gabus' ? 'bg-orange-600' : 'bg-slate-800'}\`}>Gabus</button>
                        <button onClick={() => { setT1Obj('Minyak'); setT1State('initial'); }} className={\`px-4 py-2 rounded-lg text-sm font-bold \${t1Obj === 'Minyak' ? 'bg-yellow-500 text-black' : 'bg-slate-800'}\`}>Minyak</button>
                        <button onClick={() => { setT1Obj('Besi'); setT1State('initial'); }} className={\`px-4 py-2 rounded-lg text-sm font-bold \${t1Obj === 'Besi' ? 'bg-slate-400 text-black' : 'bg-slate-800'}\`}>Bongkah Besi</button>
                     </div>
                     <button onClick={runT1Experiment} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm mt-4">MASUKKAN KE DALAM AIR</button>
                  </div>
               </div>
               <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex items-center justify-center relative overflow-hidden">
                  <div className="relative w-64 h-80 border-4 border-t-0 border-blue-900 rounded-b-3xl bg-slate-900 overflow-hidden flex flex-col justify-end">
                     <div className="absolute bottom-0 w-full h-48 bg-blue-500/30 border-t border-blue-400/50" />
                     <div className={\`absolute left-1/2 -translate-x-1/2 transition-all duration-1000 \${t1State === 'initial' ? 'top-[-50px] opacity-0' : (t1Obj === 'Besi' ? 'top-[250px]' : 'top-[110px]')}\`}>
                        {t1Obj === 'Gabus' && <div className="w-16 h-10 bg-orange-700 rounded-md border border-orange-900" />}
                        {t1Obj === 'Minyak' && <div className="w-full h-8 bg-yellow-400/80 rounded-full blur-sm -ml-8" style={{ width: '120px' }} />}
                        {t1Obj === 'Besi' && <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-700 rounded-sm shadow-xl" />}
                     </div>
                  </div>
               </div>
            </div>
          )}`;

const newUI = `          {selectedApp === 'sim_ketumpatan' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[500px]">
               <div className="w-full md:w-1/3 space-y-6">
                  <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-xl font-bold text-blue-300">Eksperimen Ketumpatan (T1)</h2>
                    <button onClick={resetT1} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors border border-slate-700 shadow-sm">Set Semula</button>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <label className="text-sm font-bold text-slate-300">Bahan Sedia Ada:</label>
                        <div className="flex flex-wrap gap-2">
                           <button onClick={() => handleDropItem('Gabus', 'gabus', 0.24)} className="flex-1 py-2 rounded-lg text-sm font-bold bg-orange-700/80 hover:bg-orange-600 text-white transition border border-orange-500 shadow-sm">Gabus (0.24)</button>
                           <button onClick={() => handleDropItem('Minyak', 'minyak', 0.9)} className="flex-1 py-2 rounded-lg text-sm font-bold bg-yellow-600/80 hover:bg-yellow-500 text-white transition border border-yellow-400 shadow-sm">Minyak (0.9)</button>
                           <button onClick={() => handleDropItem('Besi', 'besi', 7.87)} className="flex-1 py-2 rounded-lg text-sm font-bold bg-slate-600 hover:bg-slate-500 text-white transition border border-slate-400 shadow-sm">Besi (7.87)</button>
                        </div>
                     </div>

                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400"/> Cipta Bahan Sendiri:</label>
                        <div className="space-y-2">
                           <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Nama Bahan" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-purple-500 transition-colors" />
                           <div className="flex items-center gap-2">
                              <input type="number" step="0.1" value={customDensity} onChange={e => setCustomDensity(Number(e.target.value))} placeholder="Ketumpatan" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-purple-500 transition-colors" />
                              <span className="text-xs text-slate-400 font-bold whitespace-nowrap bg-slate-800 px-3 py-2.5 rounded-lg border border-slate-700">g/cm³</span>
                           </div>
                           <button onClick={() => handleDropItem(customName || 'Bahan', 'custom', customDensity)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg text-sm mt-2 transition shadow-lg shadow-purple-900/50">Jatuhkan Bahan Ke Dalam Air</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <strong className="text-blue-400">Info:</strong> Ketumpatan air adalah 1.0 g/cm³. Bahan dengan ketumpatan kurang dari 1.0 akan terapung, lebih dari 1.0 akan tenggelam.
                        </p>
                     </div>
                  </div>
               </div>

               <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex items-center justify-center relative overflow-hidden h-[500px] md:h-auto">
                  <div className="relative w-72 h-96 border-4 border-t-0 border-blue-900 rounded-b-3xl bg-slate-900 overflow-hidden flex flex-col justify-end shadow-2xl">
                     {/* Water level indicator */}
                     <div className="absolute right-2 top-[35%] text-[10px] text-blue-300/80 font-bold z-0 bg-blue-900/50 px-2 py-1 rounded-full border border-blue-800/50">1.0 g/cm³</div>
                     <div className="absolute top-[40%] w-full h-[60%] bg-blue-500/30 border-t-2 border-blue-400/80 backdrop-blur-[1px] z-10 shadow-[inset_0_10px_20px_rgba(59,130,246,0.2)]">
                        {/* Bubbles animation inside water */}
                        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')] animate-[pulse_4s_ease-in-out_infinite]" />
                     </div>
                     
                     {t1Dropped.map((obj, i) => {
                        const isMinyak = obj.type === 'minyak';
                        let finalTop = 0;
                        if (isMinyak) {
                           finalTop = 145; // Oil floats spreading
                        } else if (obj.density < 1) {
                           finalTop = 150 - (1 - obj.density) * 40;
                        } else if (obj.density > 1) {
                           finalTop = 330 - (i * 6); // stack offset
                        } else {
                           finalTop = 240;
                        }
                        
                        return (
                          <div 
                            key={obj.id} 
                            className="absolute z-20 flex flex-col items-center justify-center animate-drop-in drop-shadow-xl hover:scale-110 transition-transform cursor-pointer"
                            title={\`\${obj.name} (\${obj.density} g/cm³)\`}
                            style={{ 
                              '--final-top': \`\${finalTop}px\`, 
                              left: \`calc(50% + \${isMinyak ? 0 : obj.offsetX}px)\`,
                              transform: \`translateX(-50%)\`
                            } as React.CSSProperties}
                          >
                            <div className="text-[9px] font-bold text-white bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded mb-1.5 whitespace-nowrap z-30 opacity-0 animate-fade-in-delayed border border-slate-700">
                               {obj.name} <span className="text-blue-300">({obj.density})</span>
                            </div>
                            {obj.type === 'gabus' && <div className="w-16 h-10 bg-orange-700 rounded-md border border-orange-900 relative shadow-inner"><div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiM4QjQ1MTMiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjRDA4QjQ1Ii8+PC9zdmc+')]"/></div>}
                            {obj.type === 'minyak' && <div className="w-56 h-6 bg-yellow-400/80 rounded-full blur-[2px] shadow-[0_0_15px_rgba(250,204,21,0.4)]" />}
                            {obj.type === 'besi' && <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-800 rounded-sm shadow-inner border-2 border-slate-500" />}
                            {obj.type === 'custom' && <div className="w-12 h-12 rounded-full border-2 border-white/30 shadow-[inset_0_-5px_15px_rgba(0,0,0,0.5),0_5px_10px_rgba(0,0,0,0.3)] relative overflow-hidden" style={{ backgroundColor: obj.color }}>
                               <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20" />
                            </div>}
                          </div>
                        );
                     })}
                  </div>
               </div>
               
               <style dangerouslySetInnerHTML={{__html: \`
                 @keyframes drop-in {
                   0% { top: -60px; transform: translateX(-50%) rotate(25deg) scale(0.8); opacity: 0; }
                   30% { opacity: 1; transform: translateX(-50%) rotate(-10deg) scale(1.1); }
                   100% { top: var(--final-top); transform: translateX(-50%) rotate(0deg) scale(1); opacity: 1; }
                 }
                 .animate-drop-in {
                   animation: drop-in 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                 }
                 @keyframes fade-in-delayed {
                   0%, 70% { opacity: 0; transform: translateY(5px); }
                   100% { opacity: 1; transform: translateY(0); }
                 }
                 .animate-fade-in-delayed {
                   animation: fade-in-delayed 1.8s ease-out forwards;
                 }
               \`}} />
            </div>
          )}`;

code = code.replace(oldState, newState);
code = code.replace(oldUI, newUI);

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
