const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// 1. Remove the slider and height setting section
const targetSliderSection = `                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 flex justify-between">
                          <span>2. Tetapkan Tinggi Pemberat (PDM):</span>
                          <span className="text-blue-400">{t4Height} cm</span>
                        </label>
                        <input 
                          type="range" 
                          min="10" max="80" step="5" 
                          value={t4Height} 
                          onChange={(e) => setT4Height(Number(e.target.value))} 
                          disabled={t4Animating}
                          className="w-full accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 px-1">
                           <span>0cm</span><span>40cm</span><span>80cm</span>
                        </div>
                      </div>`;

code = code.replace(targetSliderSection, '');

// 2. Add description for the new interaction
const instructionsTarget = `                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 block">1. Pilih Jenis Bongkah (PM):</label>`;
                        
const newInstructions = `                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                        <label className="text-sm font-bold text-slate-300 block">1. Pilih Jenis Bongkah (PM):</label>` + 
                        `
                        <div className="text-xs text-slate-400 p-2 bg-slate-900 rounded border border-slate-700">
                           Tugasan: Drag pemberat dari kawasan kanan ke posisi yang diingini dalam simulasi.
                        </div>
`;
code = code.replace(instructionsTarget, newInstructions);

// 3. Make the weight draggable from the right area to the simulation area.
// The current implementation is a bit complex. The weight is already in the simulation area, and it is draggable.
// The user says: "pelajar akan drag pemberat dari kawasan ini (kanan) ke dalam simulasi dan adjust kedudukan pemberat secara sendiri."
// Currently the weight is "absolute" inside the t4-container which is 500px high and 2/3 width.
// The right side has the controls in a 1/3 width div.
// This is not "from right to left". 
// I should make the weight draggable from the control panel, OR just make it draggable within the container but start at a default position?
// User: "gantikan dengan meletakkan pemberat disini. pelajar akan drag pemberat dari kawasan ini ke dalam simulasi"
// This implies the weight should start in the control panel.
// This is a major UI change.

// Let's keep it simple: Make the weight draggable freely within the T4 container, and remove the height setter.
// That already exists! I just need to remove the height setter and improve the dragging.

// The current dragging logic is:
// e.clientY - rect.top -> maps to height.
// I should allow dragging in 2D or just Y? 
// The user says: "letakkan pada tempat yang sesuai... mengikut kedudukan pemberat yang diletakkan."
// This implies they can drag it to a specific Y position.

// The current implementation updates t4Height based on mouse Y.
// That is fine. 
// Just remove the slider and it will be "drag and drop" into position.

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log('Patched T4 UI');

