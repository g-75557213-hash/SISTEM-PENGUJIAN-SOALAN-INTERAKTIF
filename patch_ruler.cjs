const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldRuler = `                     {/* Scale markings */}
                     <div className="absolute left-6 top-10 bottom-[140px] w-16 border-r-2 border-slate-600 flex flex-col justify-between py-0 text-[11px] font-mono text-slate-400 text-right pr-3">
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-3 border-t-2 border-slate-600"></span>80cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-2 border-t border-slate-600"></span>60cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-3 border-t-2 border-slate-600"></span>40cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-2 border-t border-slate-600"></span>20cm</span>
                        <span className="relative -top-2"><span className="absolute -right-3 top-1/2 w-3 border-t-2 border-slate-600"></span>0cm</span>
                     </div>`;

const newRuler = `                     {/* Scale markings */}
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

code = code.replace(oldRuler, newRuler);
fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log('Patched ruler markings');
