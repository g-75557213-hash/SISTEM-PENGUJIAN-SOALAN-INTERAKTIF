import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target = """               <div id="sim-db-container" className="flex-1 bg-white rounded-2xl border-4 border-slate-800 overflow-hidden relative shadow-2xl flex flex-col">
                  {isFullscreen && (
                     <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 shadow-lg absolute top-0 left-0 right-0 z-50">
                        <div className="text-cyan-300 font-bold flex items-center gap-2">
                          <Eye className="w-5 h-5"/> Mod Skrin Penuh
                        </div>
                        <button onClick={() => toggleFullscreen('sim-db-container')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold border border-red-500/30 transition-colors flex items-center gap-2">
                          ✕ Tutup
                        </button>
                     </div>
                  )}
                  {(() => {
                    const simIdx = parseInt(selectedApp.replace('sim_db_', ''));
                    const simData = simulasiList?.[simIdx];
                    if (!simData) return <div className="p-8 text-center text-slate-800">Simulasi tidak dijumpai.</div>;
                    return (
                      <iframe 
                        srcDoc={simData.html}
                        className={`w-full h-full border-0 pointer-events-auto ${isFullscreen ? 'mt-16' : ''}`}
                        title={simData.bab}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      />
                    );
                  })()}
               </div>"""

replacement = """               <div id="sim-db-container" className="flex-1 bg-white rounded-2xl border-4 border-slate-800 overflow-hidden relative shadow-2xl flex flex-col bg-slate-50">
                  {isFullscreen && (
                     <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 shadow-lg w-full">
                        <div className="text-cyan-300 font-bold flex items-center gap-2">
                          <Eye className="w-5 h-5"/> Mod Skrin Penuh
                        </div>
                        <button onClick={() => toggleFullscreen('sim-db-container')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold border border-red-500/30 transition-colors flex items-center gap-2">
                          ✕ Tutup
                        </button>
                     </div>
                  )}
                  {(() => {
                    const simIdx = parseInt(selectedApp.replace('sim_db_', ''));
                    const simData = simulasiList?.[simIdx];
                    if (!simData) return <div className="p-8 text-center text-slate-800">Simulasi tidak dijumpai.</div>;
                    return (
                      <div className="flex-1 relative w-full h-full">
                        <iframe 
                          srcDoc={simData.html}
                          className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
                          title={simData.bab}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        />
                      </div>
                    );
                  })()}
               </div>"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
