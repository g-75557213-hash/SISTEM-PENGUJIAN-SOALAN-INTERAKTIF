const fs = require('fs');
let content = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

// The file currently has this around line 107:
//                         )} 
//                 className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-200"

const badPoint = '                        )} \n                className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-200"';
// Let's replace this bad point with the proper closing tags and modal start.
const missingCode = `                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && sendQ && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center">
                <Send className="w-5 h-5 mr-2" />
                Hantar ke Google Classroom
              </h3>
              <button onClick={() => setShowSendModal(false)} className="text-blue-100 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Form Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tajuk Tugasan</label>
                <input 
                  type="text" 
                  value={sendForm.title}
                  onChange={e => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Arahan / Deskripsi</label>
                <textarea 
                  rows={4}
                  value={sendForm.description}
                  onChange={e => setSendForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Markah Penuh</label>
                  <input 
                    type="number" 
                    value={sendForm.points}
                    onChange={e => setSendForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Kelas</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition">
                      <input 
                        type="checkbox"
                        checked={sendForm.courseIds.includes(c.id)}
                        onChange={(e) => {
                          setSendForm(prev => {
                            if (e.target.checked) return { ...prev, courseIds: [...prev.courseIds, c.id] };
                            return { ...prev, courseIds: prev.courseIds.filter(id => id !== c.id) };
                          })
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-slate-700 line-clamp-1">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowSendModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button 
                onClick={handleSendToGCMulti}
                disabled={loadingMulti || sendForm.courseIds.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center transition shadow-sm"
              >
                {loadingMulti ? (
                  <>Memproses...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Hantar Tugasan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Pratonton: {previewQuestion.bab}
              </h3>
              <button onClick={() => setPreviewQuestion(null)} className="text-slate-300 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Iframe Container */}
            <div className="flex-1 bg-slate-100 p-4 relative overflow-hidden">
              <iframe 
                srcDoc={(() => {
                  const scriptToInject = \`
                    <script>
                      window.USER_EMAIL = "\${user?.email || 'guru@moe-dl.edu.my'}";
                      window.USER_NAME = "\${user?.displayName || 'Guru Test'}";
                      window.PREVIEW_MODE = true;
                    </script>
                  \`;
                  return previewQuestion.html.replace('</head>', \`\${scriptToInject}</head>\`);
               })()}
                className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-200"`;

const splitText = content.split('                        )}');
if (splitText.length >= 2) {
  // Let's replace the last '                        )}' that is directly followed by '                className='
  content = content.replace(badPoint, missingCode);
  fs.writeFileSync('src/components/BankSoalan.tsx', content);
  console.log('Fixed');
} else {
  console.log('Not found');
}
