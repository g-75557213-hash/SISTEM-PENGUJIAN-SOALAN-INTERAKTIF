const fs = require('fs');
let content = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

// 1. Update Grid
content = content.replace(
  /className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"/,
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"'
);

// 2. Replace the whole button section block
const startBlock = '<div className="mt-auto space-y-3">';
const startIndex = content.indexOf(startBlock);
const textAfter = content.substring(startIndex);
const endMatch = textAfter.indexOf('})()}');
if (endMatch !== -1) {
  const endingPart = textAfter.substring(0, endMatch + 5);
  
  const newButtonsBlock = `<div className="mt-auto space-y-2">
                        {!isPosted ? (
                          <div className="relative z-0 space-y-2">
                            <button 
                              onClick={() => setPreviewQuestion(q)}
                              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition border border-slate-200 shadow-sm"
                            >
                              <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
                              Pratonton Soalan
                            </button>
                            <button 
                              onClick={() => openSendModal(q)}
                              disabled={loadingQ[q.idSoalan]}
                              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-sm"
                            >
                              <Send className="w-4 h-4 mr-1.5" />
                              {loadingQ[q.idSoalan] ? 'Memuatkan...' : 'Hantar ke Classroom'}
                            </button>
                            
                            <div className="flex gap-2 pt-1">
                              <button 
                                onClick={() => {
                                  const directLink = gasWebAppUrl 
                                    ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${q.idSoalan}\`
                                    : \`\${window.location.origin}/?qid=\${q.idSoalan}&spreadsheetId=\${spreadsheetId}&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
                                  navigator.clipboard.writeText(directLink);
                                  alert("Pautan terus murid berjaya disalin!");
                                }}
                                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center transition border border-slate-200 gap-1.5"
                                title="Salin pautan terus murid untuk dikongsi secara terus tanpa Google Classroom"
                              >
                                <Link className="w-3.5 h-3.5 text-slate-500" />
                                Salin Link
                              </button>
                              <button 
                                onClick={() => {
                                  const directLink = gasWebAppUrl 
                                    ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${q.idSoalan}\`
                                    : \`\${window.location.origin}/?qid=\${q.idSoalan}&spreadsheetId=\${spreadsheetId}&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
                                  const text = \`Assalammualaikum dan selamat sejahtera semua,\\n\\nSila lengkapkan tugasan kuiz interaktif bagi subjek *\${q.subjek}* (\${q.bab}).\\n\\nSila akses kuiz terus melalui pautan berikut:\\n\${directLink}\\n\\nTerima kasih.\`;
                                  navigator.clipboard.writeText(text);
                                  alert("Mesej pemberitahuan WhatsApp dengan pautan terus berjaya disalin!");
                                }}
                                className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white py-1.5 rounded-lg text-[10px] font-extrabold flex items-center justify-center transition gap-1.5 shadow-sm"
                                title="Salin mesej WhatsApp beserta pautan terus murid"
                              >
                                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.587-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.57 1.977 14.093.953 11.5.953c-5.44 0-9.865 4.371-9.87 9.799-.002 1.944.512 3.84 1.488 5.534l-.979 3.575 3.666-.962zm10.844-7.46c-.298-.15-1.766-.87-2.04-.97-.272-.1-.471-.15-.67.15-.198.3-.77.97-.943 1.17-.173.2-.347.225-.645.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.67-1.61-.92-2.2-.24-.585-.48-.5-.67-.51-.172-.01-.37-.01-.568-.01-.199 0-.52.075-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.766-.72 2.015-1.417.25-.697.25-1.294.175-1.417-.075-.125-.272-.2-.57-.35z"/>
                                </svg>
                                Salin WA
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative z-0 space-y-2">
                            <div className="w-full bg-emerald-50 text-emerald-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center border border-emerald-200">
                              <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                              Sudah dihantar ke Classroom!
                            </div>
                            
                            <button 
                              onClick={() => setPreviewQuestion(q)}
                              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition border border-slate-200 shadow-sm"
                            >
                              <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
                              Pratonton Soalan
                            </button>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const directLink = gasWebAppUrl 
                                    ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${q.idSoalan}\`
                                    : \`\${window.location.origin}/?qid=\${q.idSoalan}&spreadsheetId=\${spreadsheetId}&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
                                  const text = \`Assalammualaikum dan selamat sejahtera semua,\\n\\nSila lengkapkan tugasan kuiz interaktif bagi subjek *\${q.subjek}* (\${q.bab}).\\n\\nSila akses kuiz terus melalui pautan Google Classroom:\\n(Rujuk pautan tugasan di Classroom masing-masing)\\n\\nTerima kasih.\`;
                                  navigator.clipboard.writeText(text);
                                  alert("Mesej pemberitahuan WhatsApp berjaya disalin!");
                                }}
                                className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2 rounded-xl text-[10px] font-bold flex items-center justify-center transition shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5 fill-current mr-1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.587-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.57 1.977 14.093.953 11.5.953c-5.44 0-9.865 4.371-9.87 9.799-.002 1.944.512 3.84 1.488 5.534l-.979 3.575 3.666-.962zm10.844-7.46c-.298-.15-1.766-.87-2.04-.97-.272-.1-.471-.15-.67.15-.198.3-.77.97-.943 1.17-.173.2-.347.225-.645.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.67-1.61-.92-2.2-.24-.585-.48-.5-.67-.51-.172-.01-.37-.01-.568-.01-.199 0-.52.075-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.766-.72 2.015-1.417.25-.697.25-1.294.175-1.417-.075-.125-.272-.2-.57-.35z"/></svg>
                                Salin WA
                              </button>
                              <button 
                                onClick={() => handleResetStatus(q.idSoalan)}
                                className="flex-1 bg-white hover:bg-red-50 text-[#991b1b] py-2 rounded-xl text-[10px] font-bold flex items-center justify-center transition border border-[#fca5a5] shadow-sm"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                RESET STATUS
                              </button>
                            </div>
                            
                            <button 
                              onClick={() => {
                                const directLink = gasWebAppUrl 
                                  ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${q.idSoalan}\`
                                  : \`\${window.location.origin}/?qid=\${q.idSoalan}&spreadsheetId=\${spreadsheetId}&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
                                navigator.clipboard.writeText(directLink);
                                alert("Pautan terus murid berjaya disalin!");
                              }}
                              className="w-full bg-white hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center transition border border-slate-200 shadow-sm"
                            >
                              <Link className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                              Salin Link Terus
                            </button>
                          </div>
                        )}`;
  content = content.replace(endingPart, newButtonsBlock);
} else {
  console.log("Could not find the target block end");
}

fs.writeFileSync('src/components/BankSoalan.tsx', content);
