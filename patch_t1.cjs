const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const oldT1UI = `               <style dangerouslySetInnerHTML={{__html: \`
                 @keyframes drop-in {
                   0% { top: -60px; transform: translateX(-50%) rotate(25deg) scale(0.8); opacity: 0; }
                   30% { opacity: 1; transform: translateX(-50%) rotate(-10deg) scale(1.1); }
                   100% { top: var(--final-top); transform: translateX(-50%) rotate(0deg) scale(1); opacity: 1; }
                 }
                 .animate-drop-in {
                   animation: drop-in 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                 }
                 @keyframes fade-in-delayed {
                   0%, 70% { opacity: 0; transform: translateY(5px); }
                   100% { opacity: 1; transform: translateY(0); }
                 }
                 .animate-fade-in-delayed {
                   animation: fade-in-delayed 1.8s ease-out forwards;
                 }
               \`}} />
            </div>
          )}`;

const newT1UI = `               <style dangerouslySetInnerHTML={{__html: \`
                 @keyframes drop-in {
                   0% { top: -60px; transform: translateX(-50%) rotate(25deg) scale(0.8); opacity: 0; }
                   30% { opacity: 1; transform: translateX(-50%) rotate(-10deg) scale(1.1); }
                   100% { top: var(--final-top); transform: translateX(-50%) rotate(0deg) scale(1); opacity: 1; }
                 }
                 .animate-drop-in {
                   animation: drop-in 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                 }
                 @keyframes fade-in-delayed {
                   0%, 70% { opacity: 0; transform: translateY(5px); }
                   100% { opacity: 1; transform: translateY(0); }
                 }
                 .animate-fade-in-delayed {
                   animation: fade-in-delayed 1.8s ease-out forwards;
                 }
               \`}} />
            </div>
            
            {/* T1 Results Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 mt-6 w-full">
               <h3 className="text-lg font-bold text-white mb-4">Jadual Keputusan Eksperimen</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-300 border border-slate-700">
                   <thead className="bg-slate-800 text-slate-200">
                     <tr>
                       <th className="px-4 py-3 border border-slate-700">Set</th>
                       <th className="px-4 py-3 border border-slate-700">Jenis Bahan</th>
                       <th className="px-4 py-3 border border-slate-700">Ketumpatan (g/cm³)</th>
                       <th className="px-4 py-3 border border-slate-700">Pemerhatian (Terapung/Tenggelam)</th>
                     </tr>
                   </thead>
                   <tbody>
                     {t1Dropped.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic border border-slate-700">
                           Belum ada rekod. Sila masukkan bahan ke dalam air.
                         </td>
                       </tr>
                     ) : (
                       t1Dropped.map((r, i) => (
                         <tr key={r.id} className="hover:bg-slate-800/50">
                           <td className="px-4 py-2 border border-slate-700 font-bold text-slate-400">{i + 1}</td>
                           <td className="px-4 py-2 border border-slate-700">{r.name}</td>
                           <td className="px-4 py-2 border border-slate-700 font-mono text-blue-300">{r.density}</td>
                           <td className="px-4 py-2 border border-slate-700">
                              {r.density > 1 ? (
                                 <span className="text-red-400 font-bold">Tenggelam</span>
                              ) : r.density === 1 ? (
                                 <span className="text-yellow-400 font-bold">Terapung (Berada di tengah)</span>
                              ) : (
                                 <span className="text-emerald-400 font-bold">Terapung</span>
                              )}
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
            
          </div>
          )}`;

const targetContentOld = `          {selectedApp === 'sim_ketumpatan' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[500px]">`;

const targetContentNew = `          {selectedApp === 'sim_ketumpatan' && (
            <div className="flex flex-col gap-6 w-full relative z-10">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[500px]">`;

code = code.replace(oldT1UI, newT1UI);
code = code.replace(targetContentOld, targetContentNew);

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
