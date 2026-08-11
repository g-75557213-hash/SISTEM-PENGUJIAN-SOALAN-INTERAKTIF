import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target = """                    allSimulations[activeForm].map(c => (
                      <button key={c.id} onClick={() => { playSound('click'); setSelectedApp(c.id); }} className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl text-left transition-all hover:scale-105 group">
                        <div className="bg-slate-950 p-3 rounded-xl inline-block mb-4 border border-slate-800">{c.icon}</div>
                        <h3 className="text-lg font-bold text-white mb-2">{c.title}</h3>
                        <p className="text-sm text-slate-400">{c.desc}</p>
                      </button>
                    ))"""

replacement = """                    allSimulations[activeForm].map(c => (
                      <button key={c.id} onClick={() => { playSound('click'); setSelectedApp(c.id); }} className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 p-0 rounded-2xl text-left transition-all hover:scale-105 group overflow-hidden flex flex-col">
                        {c.html ? (
                          <div className="w-full h-32 relative bg-white border-b border-slate-800">
                             <iframe 
                                srcDoc={c.html} 
                                className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none" 
                                title="preview" 
                                sandbox="allow-scripts"
                             />
                             <div className="absolute inset-0 bg-transparent z-10" />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-slate-950 border-b border-slate-800 flex items-center justify-center">
                            {c.icon}
                          </div>
                        )}
                        <div className="p-5 flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">{c.title}</h3>
                          <p className="text-sm text-slate-400">{c.desc}</p>
                        </div>
                      </button>
                    ))"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
