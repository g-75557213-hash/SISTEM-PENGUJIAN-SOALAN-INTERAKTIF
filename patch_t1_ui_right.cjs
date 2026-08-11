const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldRightPanel = `<div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex items-center justify-center relative overflow-hidden h-[500px] md:h-auto">
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
               </div>`;

const newRightPanel = `<div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex items-center justify-center relative overflow-hidden h-[500px] md:h-auto">
                  <div className="relative w-72 h-96 border-4 border-t-0 border-blue-900 rounded-b-3xl bg-slate-900 overflow-hidden flex flex-col justify-end shadow-2xl transition-colors duration-500">
                     {/* Liquid level indicator */}
                     <div className={\`absolute right-2 top-[35%] text-[10px] font-bold z-0 px-2 py-1 rounded-full border border-white/10 \${baseLiquid.textColor} \${baseLiquid.tagColor} transition-colors duration-500\`}>{baseLiquid.density.toFixed(2)} g/cm³</div>
                     <div className={\`absolute top-[40%] w-full h-[60%] border-t-2 backdrop-blur-[1px] z-10 shadow-[inset_0_10px_20px_rgba(0,0,0,0.2)] \${baseLiquid.color} \${baseLiquid.border} transition-colors duration-500\`}>
                        {/* Bubbles animation inside liquid */}
                        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')] animate-[pulse_4s_ease-in-out_infinite]" />
                     </div>
                     
                     {t1Dropped.map((obj, i) => {
                        const isMinyak = obj.type === 'minyak';
                        let finalTop = 0;
                        
                        if (isMinyak && obj.density < baseLiquid.density) {
                           finalTop = 145; // Oil floats spreading
                        } else if (obj.density < baseLiquid.density) {
                           finalTop = 150 - (baseLiquid.density - obj.density) * 20;
                           // Ensure it doesn't go too high
                           finalTop = Math.max(50, finalTop);
                        } else if (obj.density > baseLiquid.density) {
                           finalTop = 330 - (i * 6); // stack offset
                        } else {
                           finalTop = 240; // suspended
                        }
                        
                        return (
                          <div 
                            key={obj.id} 
                            className="absolute z-20 flex flex-col items-center justify-center animate-drop-in drop-shadow-xl hover:scale-110 transition-transform cursor-pointer"
                            title={\`\${obj.name} (\${obj.density} g/cm³)\`}
                            style={{ 
                              '--final-top': \`\${finalTop}px\`, 
                              left: \`calc(50% + \${(isMinyak && obj.density < baseLiquid.density) ? 0 : obj.offsetX}px)\`,
                              transform: \`translateX(-50%)\`
                            } as React.CSSProperties}
                          >
                            <div className="text-[9px] font-bold text-white bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 rounded mb-1.5 whitespace-nowrap z-30 opacity-0 animate-fade-in-delayed border border-slate-700">
                               {obj.name} <span className="text-blue-300">({obj.density})</span>
                            </div>
                            {obj.type === 'gabus' && <div className="w-16 h-10 bg-orange-700 rounded-md border border-orange-900 relative shadow-inner"><div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiM4QjQ1MTMiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjRDA4QjQ1Ii8+PC9zdmc+')]"/></div>}
                            {obj.type === 'minyak' && <div className={\`w-56 h-6 bg-yellow-400/80 rounded-full blur-[2px] shadow-[0_0_15px_rgba(250,204,21,0.4)] \${obj.density >= baseLiquid.density ? 'w-16 h-8' : ''}\`} />}
                            {obj.type === 'besi' && <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-800 rounded-sm shadow-inner border-2 border-slate-500" />}
                            {obj.type === 'custom' && <div className="w-12 h-12 rounded-full border-2 border-white/30 shadow-[inset_0_-5px_15px_rgba(0,0,0,0.5),0_5px_10px_rgba(0,0,0,0.3)] relative overflow-hidden" style={{ backgroundColor: obj.color }}>
                               <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20" />
                            </div>}
                          </div>
                        );
                     })}
                  </div>
               </div>`;

if (code.includes(oldRightPanel)) {
    code = code.replace(oldRightPanel, newRightPanel);
    fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
    console.log("Replaced right panel successfully!");
} else {
    console.log("Could not find the target string for right panel!");
}
