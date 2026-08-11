import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

# 1. Add state
old_state = "  const [selectedApp, setSelectedApp] = useState<string | null>(null);"
new_state = """  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);"""
content = content.replace(old_state, new_state)

# 2. Add full screen overlay and update the preview buttons
old_db_preview = """          {selectedApp.startsWith('sim_db_') && (
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
          )}"""

new_db_preview = """          {selectedApp.startsWith('sim_db_') && (
            <div className="flex flex-col gap-6 w-full relative z-10 h-[calc(100vh-120px)]">
               <div className="flex items-center justify-between">
                 <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali ke Senarai</button>
                 <button onClick={() => setIsFullscreen(true)} className="bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-800 text-cyan-300 font-bold text-sm shadow-lg hover:shadow-cyan-900/20 transition-all flex items-center gap-2">
                    <MonitorPlay className="w-4 h-4"/> Pratonton Simulasi (Penuh)
                 </button>
               </div>
               
               <div className="flex-1 bg-white rounded-2xl border-4 border-slate-800 overflow-hidden relative shadow-2xl">
                  {(() => {
                    const simIdx = parseInt(selectedApp.replace('sim_db_', ''));
                    const simData = simulasiList?.[simIdx];
                    if (!simData) return <div className="p-8 text-center text-slate-800">Simulasi tidak dijumpai.</div>;
                    return (
                      <iframe 
                        srcDoc={simData.html}
                        className="w-[200%] h-[200%] origin-top-left scale-50 border-0 pointer-events-auto"
                        title={simData.bab}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      />
                    );
                  })()}
               </div>
               
               {/* FULLSCREEN OVERLAY */}
               {isFullscreen && (
                  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
                     <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 shadow-lg">
                        <div className="text-cyan-300 font-bold flex items-center gap-2">
                          <Eye className="w-5 h-5"/> Mod Skrin Penuh
                        </div>
                        <button onClick={() => setIsFullscreen(false)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg font-bold border border-red-500/30 transition-colors flex items-center gap-2">
                          ✕ Tutup Skrin Penuh
                        </button>
                     </div>
                     <div className="flex-1 bg-white relative w-full h-full overflow-hidden">
                        {(() => {
                          const simIdx = parseInt(selectedApp.replace('sim_db_', ''));
                          const simData = simulasiList?.[simIdx];
                          if (!simData) return null;
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
            </div>
          )}"""

content = content.replace(old_db_preview, new_db_preview)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
