import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target = """          {/* SIMULASI: T2 BANDUL (BENCHMARK LOVABLE) */}"""

replacement = """          {selectedApp.startsWith('sim_db_') && (
            <div className="flex flex-col gap-6 w-full relative z-10 h-[calc(100vh-120px)]">
               <div className="flex items-center justify-between">
                 <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali ke Senarai</button>
                 <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-cyan-300 font-bold text-sm">Pratonton Simulasi (Penuh)</div>
               </div>
               
               <div className="flex-1 bg-white rounded-2xl border-4 border-slate-800 overflow-hidden relative shadow-2xl">
                  {(() => {
                    const simIdx = parseInt(selectedApp.replace('sim_db_', ''));
                    const simData = simulasiList?.[simIdx];
                    if (!simData) return <div className="p-8 text-center text-slate-800">Simulasi tidak dijumpai.</div>;
                    return (
                      <iframe 
                        srcDoc={simData.html}
                        className="w-full h-full border-0"
                        title={simData.bab}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      />
                    );
                  })()}
               </div>
            </div>
          )}

          {/* SIMULASI: T2 BANDUL (BENCHMARK LOVABLE) */}"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
