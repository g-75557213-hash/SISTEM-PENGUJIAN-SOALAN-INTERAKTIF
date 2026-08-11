const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `<p className="text-[10px] text-slate-400 mt-0.5">URL Web App Apps Script untuk fungsi simpanan langsung, gred automatik & integrasi Google Classroom.</p>
                  </div>`;

const replacement = targetStr + `
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Pautan Folder Google Drive (Untuk Video)</label>
                    <input 
                      type="text"
                      value={driveFolderLink}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setDriveFolderLink(val);
                        localStorage.setItem('smkj_drive_folder_link', val);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan pautan folder Google Drive (contoh: https://drive.google.com/drive/folders/...)"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Sila pastikan folder ini telah dikongsi "Anyone with the link can view".</p>
                  </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched UI for drive config in App.tsx');
} else {
  console.log('Target string not found');
}
