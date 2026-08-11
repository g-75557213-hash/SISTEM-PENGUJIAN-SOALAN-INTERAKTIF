import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target = """                        <div className="w-full md:w-1/2 flex flex-col">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400"/> Pratonton Simulasi</h3>
              <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[600px] h-full w-full">
                {!previewHTML.trim() ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                    <MonitorPlay className="w-12 h-12 mb-2 opacity-50"/>
                    <p className="text-sm font-medium">Klik "Uji Simulasi" untuk papar</p>
                  </div>
                ) : (
                  <iframe 
                    ref={iframeRef}
                    srcDoc={previewHTML}
                    className="w-[200%] h-[200%] origin-top-left scale-50 border-0 pointer-events-auto"
                    title="Simulation Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </div>
            </div>"""

replacement = """                        <div className="w-full md:w-1/2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400"/> Pratonton Simulasi</h3>
                {previewHTML.trim() && (
                  <button onClick={() => toggleFullscreen('sim-create-container')} className="bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-cyan-300 font-bold text-xs shadow-md transition-colors flex items-center gap-2">
                    <MonitorPlay className="w-3 h-3"/> Skrin Penuh
                  </button>
                )}
              </div>
              <div id="sim-create-container" className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[600px] h-full w-full flex flex-col">
                {isFullscreen && (
                   <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 shadow-lg w-full">
                      <div className="text-cyan-300 font-bold flex items-center gap-2">
                        <Eye className="w-5 h-5"/> Mod Skrin Penuh
                      </div>
                      <button onClick={() => toggleFullscreen('sim-create-container')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold border border-red-500/30 transition-colors flex items-center gap-2">
                        ✕ Tutup
                      </button>
                   </div>
                )}
                {!previewHTML.trim() ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                    <MonitorPlay className="w-12 h-12 mb-2 opacity-50"/>
                    <p className="text-sm font-medium">Klik "Uji Simulasi" untuk papar</p>
                  </div>
                ) : (
                  <div className="flex-1 relative w-full h-full bg-white">
                    <iframe 
                      ref={iframeRef}
                      srcDoc={previewHTML}
                      className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
                      title="Simulation Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                )}
              </div>
            </div>"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
