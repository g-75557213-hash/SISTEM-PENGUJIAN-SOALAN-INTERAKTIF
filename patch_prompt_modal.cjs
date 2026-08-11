const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetUI = `                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Ciri-ciri & Kriteria Soalan (Pilihan)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Terangkan jenis latihan yang anda mahukan (contoh: "Soalan jenis seret dan lepas, berikan tema lautan, jadikan teks besar dan mudah dibaca"). Kriteria ini akan dimasukkan ke dalam prompt.
                  </p>
                  <textarea
                    value={promptKriteria}
                    onChange={(e) => setPromptKriteria(e.target.value)}
                    placeholder="Contoh: Saya mahukan tema angkasa lepas. Jenis latihan adalah padankan perkataan..."
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition"
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-3 pt-2">`;

const newUI = `                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Ciri-ciri & Kriteria Soalan (Pilihan)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Terangkan jenis latihan yang anda mahukan (contoh: "Soalan jenis seret dan lepas, berikan tema lautan, jadikan teks besar dan mudah dibaca"). Kriteria ini akan dimasukkan ke dalam prompt.
                  </p>
                  <textarea
                    value={promptKriteria}
                    onChange={(e) => setPromptKriteria(e.target.value)}
                    placeholder="Contoh: Saya mahukan tema angkasa lepas. Jenis latihan adalah padankan perkataan..."
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none transition"
                    rows={4}
                  />
                </div>

                {driveFolderLink && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Muat Naik Video (Pilihan)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Muat naik video sebagai rujukan atau panduan bagi jawapan (seperti eksperimen), video ini akan diintegrasikan ke dalam soalan.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      <input 
                        type="file" 
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setVideoFile(e.target.files[0]);
                            setVideoUrl(''); // reset if new file selected
                          }
                        }}
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      
                      {videoFile && !videoUrl && (
                        <button
                          onClick={async () => {
                            if (!token) return alert('Sila log masuk dahulu');
                            if (!driveFolderLink) return alert('Sila masukkan pautan folder Google Drive di ruangan admin');
                            
                            setIsUploadingVideo(true);
                            try {
                              const url = await uploadFileToDrive(token, videoFile, driveFolderLink);
                              setVideoUrl(url);
                              alert('Video berjaya dimuat naik ke Google Drive!');
                            } catch (err: any) {
                              console.error(err);
                              alert(err.message || 'Ralat muat naik');
                            }
                            setIsUploadingVideo(false);
                          }}
                          disabled={isUploadingVideo}
                          className="self-start text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg disabled:opacity-50"
                        >
                          {isUploadingVideo ? 'Memuat naik...' : 'Upload ke Drive'}
                        </button>
                      )}
                      
                      {videoUrl && (
                        <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          ✓ Berjaya dimuat naik
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">`;

if (code.includes(targetUI)) {
  code = code.replace(targetUI, newUI);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched modal UI');
} else {
  console.log('Could not find modal UI target');
}
