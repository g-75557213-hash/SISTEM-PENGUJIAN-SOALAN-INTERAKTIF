const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldState = `  // --- T2 Simulation State (Bandul Ringkas - Benchmark) ---
  const [t2Length, setT2Length] = useState<number>(50); // cm
  const [t2Mass, setT2Mass] = useState<number>(50); // g
  const [t2Gravity, setT2Gravity] = useState<number>(9.81);
  const [t2IsRunning, setT2IsRunning] = useState(false);
  const [t2Angle, setT2Angle] = useState(0);
  const t2ReqRef = useRef<number>();
  const t2StartTime = useRef<number>(0);
  const t2MaxAngle = 30 * (Math.PI / 180);

  const t2Period = 2 * Math.PI * Math.sqrt((t2Length / 100) / t2Gravity);

  const toggleT2 = () => {
    playSound('click');
    if (t2IsRunning) {
      cancelAnimationFrame(t2ReqRef.current!);
      setT2IsRunning(false);
      setT2Angle(0);
    } else {
      t2StartTime.current = performance.now();
      setT2IsRunning(true);
      const animate = (time: number) => {
        const elapsed = (time - t2StartTime.current) / 1000;
        const currentAngle = t2MaxAngle * Math.cos((2 * Math.PI / t2Period) * elapsed);
        setT2Angle(currentAngle);
        t2ReqRef.current = requestAnimationFrame(animate);
      };
      t2ReqRef.current = requestAnimationFrame(animate);
    }
  };`;

const newState = `  // --- T2 Simulation State (Bandul Ringkas - Benchmark) ---
  const [t2Length, setT2Length] = useState<number>(50); // cm
  const [t2Mass, setT2Mass] = useState<number>(50); // g
  const [t2Gravity, setT2Gravity] = useState<number>(9.81);
  const [t2IsRunning, setT2IsRunning] = useState(false);
  const [t2Angle, setT2Angle] = useState(0);
  const t2ReqRef = useRef<number>();
  const t2StartTime = useRef<number>(0);
  const t2MaxAngle = 30 * (Math.PI / 180);

  const [t2Results, setT2Results] = useState<{ length: number, mass: number, gravity: number, time10: number, period: number }[]>([]);
  const [t2TimeStr, setT2TimeStr] = useState<string>('0.00');
  const [t2OscCount, setT2OscCount] = useState<number>(0);
  const lastT2UpdateRef = useRef<number>(0);

  const t2Period = 2 * Math.PI * Math.sqrt((t2Length / 100) / t2Gravity);

  const toggleT2 = () => {
    playSound('click');
    if (t2IsRunning) {
      cancelAnimationFrame(t2ReqRef.current!);
      setT2IsRunning(false);
      setT2Angle(0);
      setT2TimeStr('0.00');
      setT2OscCount(0);
    } else {
      t2StartTime.current = performance.now();
      lastT2UpdateRef.current = 0;
      setT2IsRunning(true);
      setT2TimeStr('0.00');
      setT2OscCount(0);
      const animate = (time: number) => {
        const elapsed = (time - t2StartTime.current) / 1000;
        const currentAngle = t2MaxAngle * Math.cos((2 * Math.PI / t2Period) * elapsed);
        setT2Angle(currentAngle);
        
        if (time - lastT2UpdateRef.current > 100) {
           setT2TimeStr(elapsed.toFixed(2));
           setT2OscCount(Math.min(10, Math.floor(elapsed / t2Period)));
           lastT2UpdateRef.current = time;
        }

        if (elapsed >= 10 * t2Period) {
           setT2IsRunning(false);
           setT2Angle(t2MaxAngle);
           setT2TimeStr((10 * t2Period).toFixed(2));
           setT2OscCount(10);
           playSound('success');
           setT2Results(prev => [...prev, { length: t2Length, mass: t2Mass, gravity: t2Gravity, time10: 10 * t2Period, period: t2Period }]);
           return;
        }

        t2ReqRef.current = requestAnimationFrame(animate);
      };
      t2ReqRef.current = requestAnimationFrame(animate);
    }
  };`;

code = code.replace(oldState, newState);

// The exact string for oldUI
const oldUI = `          {selectedApp === 'sim_bandul' && (
             <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[600px]">
                <div className="w-full md:w-1/3 space-y-6">
                   <button onClick={() => { setSelectedApp(null); setT2IsRunning(false); }} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                   <h2 className="text-2xl font-bold text-fuchsia-300 border-b border-slate-800 pb-3">Bandul Ringkas (T2)</h2>
                   
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300"><label className="font-bold">Panjang Tali (cm)</label><span>{t2Length}</span></div>
                        <input type="range" min="10" max="100" value={t2Length} onChange={e => setT2Length(Number(e.target.value))} className="w-full accent-fuchsia-500" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300"><label className="font-bold">Jisim Ladung (g)</label><span>{t2Mass}</span></div>
                        <input type="range" min="10" max="200" value={t2Mass} onChange={e => setT2Mass(Number(e.target.value))} className="w-full accent-fuchsia-500" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300"><label className="font-bold">Graviti (m/s²)</label><span>{t2Gravity.toFixed(2)}</span></div>
                        <select value={t2Gravity} onChange={e => setT2Gravity(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm">
                           <option value={9.81}>Bumi (9.81)</option>
                           <option value={1.62}>Bulan (1.62)</option>
                           <option value={24.79}>Musytari (24.79)</option>
                        </select>
                      </div>
                      
                      <button onClick={toggleT2} className={\`w-full py-3 \${t2IsRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500'} text-white font-bold rounded-xl text-sm shadow-lg flex justify-center gap-2 transition-colors\`}>
                        {t2IsRunning ? 'Berhenti' : 'Mula Hayunan'}
                      </button>
                      
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                         <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Kiraan Tempoh, T</div>
                         <div className="text-3xl font-mono text-fuchsia-400 font-bold">{t2Period.toFixed(2)} s</div>
                         <p className="text-[10px] text-slate-500 mt-2">Formula: T = 2π√(l/g). Perhatikan bahawa jisim ladung tidak mempengaruhi tempoh hayunan.</p>
                      </div>
                   </div>
                </div>
                
                <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden h-[500px] md:h-auto">
                   <div className="absolute top-0 left-0 w-full h-full" style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)' }}>
                      {/* Grid overlay for scientific feel */}
                      <div className="w-full h-full opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                   </div>
                   
                   {/* Pendulum Mount */}
                   <div className="absolute top-10 left-1/2 -translate-x-1/2 w-16 h-2 bg-slate-600 rounded-full" />
                   
                   {/* Pendulum Swing Container */}
                   <div className="absolute top-11 left-1/2" style={{ transform: \`rotate(\${t2Angle}rad)\`, transformOrigin: 'top center', height: \`\${t2Length * 3}px\` }}>
                      {/* String */}
                      <div className="w-0.5 h-full bg-slate-300 mx-auto" />
                      {/* Bob */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ 
                        width: \`\${Math.max(20, t2Mass / 4)}px\`, 
                        height: \`\${Math.max(20, t2Mass / 4)}px\`,
                        background: 'radial-gradient(circle at 30% 30%, #f472b6, #db2777, #831843)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.3)',
                        bottom: \`-\${Math.max(20, t2Mass / 4) / 2}px\`
                      }} />
                   </div>
                </div>
             </div>
          )}`;

const newUI = `          {selectedApp === 'sim_bandul' && (
            <div className="flex flex-col gap-6 w-full relative z-10">
             <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[500px]">
                <div className="w-full md:w-1/3 space-y-6">
                   <button onClick={() => { setSelectedApp(null); setT2IsRunning(false); }} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                   <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                     <h2 className="text-xl font-bold text-fuchsia-300">Bandul Ringkas (T2)</h2>
                     <button onClick={() => setT2Results([])} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors border border-slate-700 shadow-sm">Set Semula Data</button>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300"><label className="font-bold">Panjang Tali (cm)</label><span>{t2Length}</span></div>
                        <input type="range" min="10" max="100" value={t2Length} onChange={e => setT2Length(Number(e.target.value))} className="w-full accent-fuchsia-500" disabled={t2IsRunning} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300"><label className="font-bold">Jisim Ladung (g)</label><span>{t2Mass}</span></div>
                        <input type="range" min="10" max="200" value={t2Mass} onChange={e => setT2Mass(Number(e.target.value))} className="w-full accent-fuchsia-500" disabled={t2IsRunning} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300"><label className="font-bold">Graviti (m/s²)</label><span>{t2Gravity.toFixed(2)}</span></div>
                        <select disabled={t2IsRunning} value={t2Gravity} onChange={e => setT2Gravity(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm">
                           <option value={9.81}>Bumi (9.81)</option>
                           <option value={1.62}>Bulan (1.62)</option>
                           <option value={24.79}>Musytari (24.79)</option>
                        </select>
                      </div>
                      
                      <button onClick={toggleT2} className={\`w-full py-3 \${t2IsRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500'} text-white font-bold rounded-xl text-sm shadow-lg flex justify-center gap-2 transition-colors\`}>
                        {t2IsRunning ? 'Berhenti' : 'Mula Hayunan (10 Ayunan)'}
                      </button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center">
                           <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Masa (s)</div>
                           <div className="text-2xl font-mono text-fuchsia-400 font-bold">{t2TimeStr}</div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center">
                           <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Ayunan</div>
                           <div className="text-2xl font-mono text-emerald-400 font-bold">{t2OscCount}/10</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 text-center bg-slate-900 p-2 rounded-lg border border-slate-800">T = 2π√(l/g). Masa direkodkan selepas 10 ayunan lengkap.</p>
                   </div>
                </div>
                
                <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden h-[500px] md:h-auto">
                   <div className="absolute top-0 left-0 w-full h-full" style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)' }}>
                      <div className="w-full h-full opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                   </div>
                   
                   <div className="absolute top-10 left-1/2 -translate-x-1/2 w-16 h-2 bg-slate-600 rounded-full" />
                   
                   <div className="absolute top-11 left-1/2" style={{ transform: \`rotate(\${t2Angle}rad)\`, transformOrigin: 'top center', height: \`\${t2Length * 3}px\` }}>
                      <div className="w-0.5 h-full bg-slate-300 mx-auto" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full" style={{ 
                        width: \`\${Math.max(20, t2Mass / 4)}px\`, 
                        height: \`\${Math.max(20, t2Mass / 4)}px\`,
                        background: 'radial-gradient(circle at 30% 30%, #f472b6, #db2777, #831843)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.3)',
                        bottom: \`-\${Math.max(20, t2Mass / 4) / 2}px\`
                      }} />
                   </div>
                </div>
             </div>
             
             {/* T2 Results Table */}
             <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8">
                <h3 className="text-lg font-bold text-white mb-4">Jadual Keputusan Eksperimen</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-300 border border-slate-700">
                    <thead className="bg-slate-800 text-slate-200">
                      <tr>
                        <th className="px-4 py-3 border border-slate-700">Set</th>
                        <th className="px-4 py-3 border border-slate-700">Panjang, l (cm)</th>
                        <th className="px-4 py-3 border border-slate-700">Jisim, m (g)</th>
                        <th className="px-4 py-3 border border-slate-700">Graviti, g (m/s²)</th>
                        <th className="px-4 py-3 border border-slate-700">Masa 10 Ayunan, t (s)</th>
                        <th className="px-4 py-3 border border-slate-700">Tempoh, T = t/10 (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t2Results.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic border border-slate-700">
                            Belum ada rekod. Sila jalankan eksperimen. Minimum 3 pengulangan disarankan.
                          </td>
                        </tr>
                      ) : (
                        t2Results.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="px-4 py-2 border border-slate-700 font-bold text-slate-400">{i + 1}</td>
                            <td className="px-4 py-2 border border-slate-700">{r.length}</td>
                            <td className="px-4 py-2 border border-slate-700">{r.mass}</td>
                            <td className="px-4 py-2 border border-slate-700">{r.gravity}</td>
                            <td className="px-4 py-2 border border-slate-700 font-mono text-fuchsia-300">{r.time10.toFixed(2)}</td>
                            <td className="px-4 py-2 border border-slate-700 font-mono text-emerald-300">{r.period.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
            </div>
          )}`;

code = code.replace(oldUI, newUI);
fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
