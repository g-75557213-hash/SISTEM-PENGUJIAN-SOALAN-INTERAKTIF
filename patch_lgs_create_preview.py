import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

old_create_preview = """              <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[600px] h-full w-full">
                {!previewHTML.trim() ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                    <MonitorPlay className="w-12 h-12 mb-2 opacity-50"/>
                    <p className="text-sm font-medium">Klik "Uji Simulasi" untuk papar</p>
                  </div>
                ) : (
                  <iframe 
                    ref={iframeRef}
                    srcDoc={previewHTML}
                    className="w-full h-full border-0"
                    title="Simulation Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </div>"""

new_create_preview = """              <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[600px] h-full w-full">
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
              </div>"""

content = content.replace(old_create_preview, new_create_preview)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
