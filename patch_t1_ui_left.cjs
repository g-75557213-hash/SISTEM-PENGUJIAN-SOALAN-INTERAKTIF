const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldLeftPanel = `<div className="space-y-4">
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
                  </div>`;

const newLeftPanel = `<div className="space-y-4">
                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <label className="text-sm font-bold text-slate-300">Pilih Cecair Asas:</label>
                        <select value={baseLiquidId} onChange={e => setBaseLiquidId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors">
                           {liquidOptions.map(l => (
                             <option key={l.id} value={l.id}>{l.name} ({l.density} g/cm³)</option>
                           ))}
                        </select>
                     </div>

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
                           <button onClick={() => handleDropItem(customName || 'Bahan', 'custom', customDensity)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg text-sm mt-2 transition shadow-lg shadow-purple-900/50">Jatuhkan Bahan Ke Dalam {baseLiquid.name}</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <strong className="text-blue-400">Info:</strong> Ketumpatan {baseLiquid.name.toLowerCase()} adalah {baseLiquid.density} g/cm³. Bahan dengan ketumpatan kurang dari {baseLiquid.density} akan terapung, lebih dari {baseLiquid.density} akan tenggelam.
                        </p>
                     </div>
                  </div>`;

if (code.includes(oldLeftPanel)) {
    code = code.replace(oldLeftPanel, newLeftPanel);
    fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find the target string!");
}
