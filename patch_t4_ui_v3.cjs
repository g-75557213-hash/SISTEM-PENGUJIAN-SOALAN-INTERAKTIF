const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// 1. Remove slider UI completely
const targetSlider = `                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 flex justify-between">
                          <span>2. Tetapkan Tinggi Pemberat (PDM):</span>
                          <span className="text-blue-400">{t4Height} cm</span>
                        </label>
                        <input 
                          type="range" 
                          min="10" max="80" step="5" 
                          value={t4Height} 
                          onChange={(e) => setT4Height(Number(e.target.value))} 
                          disabled={t4Animating}
                          className="w-full accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 px-1">
                           <span>0cm</span><span>40cm</span><span>80cm</span>
                        </div>
                      </div>`;
code = code.replace(targetSlider, '');

// 2. Add description for the new interaction
const instructionsTarget = `                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 block">1. Pilih Jenis Bongkah (PM):</label>`;
                        
const newInstructions = `                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 block">1. Pilih Jenis Bongkah (PM):</label>
                        <div className="text-xs text-slate-400 p-2 bg-slate-900 rounded border border-slate-700">
                           Tugasan: Drag pemberat ke dalam simulasi dan letakkan di posisi yang diingini.
                        </div>`;
code = code.replace(instructionsTarget, newInstructions);

// 3. Update ruler to start from 0 at the block surface
// The block is at the bottom, so 0cm should be at the surface, and 80cm at the top.
// Current scale markings start at the top and go down.
const oldRuler = `                     {/* Scale markings */}
                     <div className="absolute left-6 top-10 bottom-[140px] w-16 border-r-2 border-slate-600 flex flex-col justify-between py-0 text-[10px] font-mono text-slate-400 text-right pr-2">
                        {Array.from({ length: 17 }).map((_, i) => {
                          const cm = i * 5;
                          return (
                            <div key={cm} className="relative flex items-center justify-end">
                              <span className={\`absolute -right-2 w-\${cm % 10 === 0 ? '4' : '2'} border-t border-slate-600\`}></span>
                              {cm % 10 === 0 && <span className="mr-3">{cm}cm</span>}
                            </div>
                          );
                        })}
                     </div>`;

const newRuler = `                     {/* Scale markings */}
                     <div className="absolute left-6 top-10 bottom-[140px] w-16 border-r-2 border-slate-600 flex flex-col-reverse justify-between py-0 text-[10px] font-mono text-slate-400 text-right pr-2">
                        {Array.from({ length: 17 }).map((_, i) => {
                          const cm = i * 5;
                          return (
                            <div key={cm} className="relative flex items-center justify-end">
                              <span className={\`absolute -right-2 w-\${cm % 10 === 0 ? '4' : '2'} border-t border-slate-600\`}></span>
                              {cm % 10 === 0 && <span className="mr-3">{cm}cm</span>}
                            </div>
                          );
                        })}
                     </div>`;

code = code.replace(oldRuler, newRuler);

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log('Patched T4 UI v3');
