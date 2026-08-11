const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// Update logic
code = code.replace(/t4Height \/ 50/g, 't4Height / 80');
code = code.replace(/normalizedHeight = t4Height \/ 80/, 'normalizedHeight = t4Height / 80');
code = code.replace(/const baseDent = t4Block === 'Kuprum' \? 2\.5 : 1\.2;/, "const baseDent = t4Block === 'Kuprum' ? 2.8 : 1.4;");

// Update slider max and text
code = code.replace(/min="10" max="50" step="5"/g, 'min="10" max="80" step="5"');
code = code.replace(/<span>10cm<\/span>\s*<span>30cm<\/span>\s*<span>50cm<\/span>/, '<span>0cm</span><span>40cm</span><span>80cm</span>');

// Update the ruler and animation part
const uiStart = `                     {/* Scale markings */}`;
const uiEnd = `                     <style>{\``;

const newUI = `                     {/* Scale markings */}
                     <div className="absolute left-6 top-10 bottom-[140px] w-16 border-r-2 border-slate-600 flex flex-col justify-between py-0 text-[11px] font-mono text-slate-400 text-right pr-3">
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-3 border-t-2 border-slate-600"></span>80cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-2 border-t border-slate-600"></span>60cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-3 border-t-2 border-slate-600"></span>40cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-2 border-t border-slate-600"></span>20cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-3 border-t-2 border-slate-600"></span>0cm</span>
                     </div>
                     
                     <div className="relative w-72 h-full flex flex-col items-center justify-end pb-10 z-10">
                        {/* Drop guide line */}
                        <div className="absolute top-10 bottom-[160px] w-px bg-slate-800/50 -z-10 border-l-2 border-dashed border-slate-600/30" />
                        
                        {/* Interactive Weight Slider (Hidden but functional) */}
                        <input 
                           type="range"
                           min="0" max="80" step="1"
                           value={t4Height}
                           onChange={(e) => setT4Height(Number(e.target.value))}
                           disabled={t4Animating}
                           className="absolute left-10 top-10 bottom-[140px] w-12 appearance-none bg-transparent opacity-0 cursor-grab z-40"
                           style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                        />
                        
                        {/* Interactive Weight */}
                        <div 
                          className={\`w-24 h-24 bg-gradient-to-br from-slate-300 to-slate-500 absolute flex flex-col items-center justify-center font-bold text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.5)] border-b-4 border-slate-600 rounded-md z-30 transition-all \${t4Animating ? 'animate-drop-weight' : 'duration-300 cursor-ns-resize hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'}\`} 
                          style={{ 
                            top: t4Animating ? undefined : \`calc(10px + \${((80 - t4Height) / 80) * (100 - 150/5)}%)\`, 
                            '--drop-start': \`calc(10px + \${((80 - t4Height) / 80) * (100 - 150/5)}%)\`,
                            '--drop-duration': \`\${Math.max(0.4, Math.sqrt(t4Height/80) * 0.8)}s\`
                          } as React.CSSProperties}
                        >
                           <span className="text-2xl">1 KG</span>
                           <span className="text-[10px] opacity-70">Pemberat</span>
                        </div>
                        
                        {/* Steel Ball */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 relative z-20 shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center" style={{ marginBottom: '-8px' }}>
                           <div className="w-3 h-3 bg-white/70 rounded-full absolute top-1 left-2 blur-[1px]"></div>
                        </div>
                        
                        {/* Block */}
                        <div className={\`w-56 h-28 relative flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.9)] border-t-[3px] border-white/30 transition-colors duration-500 rounded-sm z-10 \${t4Block === 'Kuprum' ? 'bg-gradient-to-br from-orange-600 via-orange-700 to-orange-950' : 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-900'}\`}>
                           {/* Highlight */}
                           <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10"></div>
                           
                           {/* Dent Visualization */}
                           {t4Dent && !t4Animating && (
                              <div className="absolute top-0 w-10 h-3 bg-black/90 rounded-full shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-visible" style={{ transform: \`scaleX(\${t4Dent / 2.5})\` }}>
                                 <div className="absolute -top-10 bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-md whitespace-nowrap border border-slate-600 animate-fade-in-up shadow-xl z-50">
                                    {t4Dent.toFixed(1)} cm
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-b border-r border-slate-600 rotate-45"></div>
                                 </div>
                              </div>
                           )}
                           
                           {/* Label on block */}
                           <div className="absolute bottom-3 right-4 text-white/50 font-bold text-sm tracking-widest uppercase">
                              {t4Block}
                           </div>
                        </div>
                        
                        {/* Table base */}
                        <div className="absolute -bottom-5 w-[450px] h-5 bg-gradient-to-r from-transparent via-slate-700 to-transparent rounded-full blur-[3px]"></div>
                     </div>
`;

const startIndex = code.indexOf(uiStart);
const endIndex = code.indexOf(uiEnd);
if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + newUI + code.substring(endIndex);
}

// Update the drop animation CSS
const styleStart = `<style>{\``;
const styleEnd = `\`}</style>`;

const newStyle = `<style>{\`
                        @keyframes drop-weight { 
                           0% { top: var(--drop-start); transform: scale(1); } 
                           85% { top: calc(100% - 180px); transform: scale(1); } 
                           95% { top: calc(100% - 175px); transform: scaleY(0.9); }
                           100% { top: calc(100% - 180px); transform: scale(1); } 
                        } 
                        .animate-drop-weight { 
                           animation: drop-weight var(--drop-duration, 0.8s) cubic-bezier(0.5, 0, 0.9, 1) forwards; 
                        }
                     \`}
</style>`;

const sStartIndex = code.indexOf(styleStart);
const sEndIndex = code.indexOf(styleEnd) + styleEnd.length;
if (sStartIndex !== -1 && sEndIndex !== -1) {
    code = code.substring(0, sStartIndex) + newStyle + code.substring(sEndIndex);
}

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log("Applied T4 full fixes");
