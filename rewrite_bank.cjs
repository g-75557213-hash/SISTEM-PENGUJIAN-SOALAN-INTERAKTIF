const fs = require('fs');

const code = `import React, { useState, useMemo } from 'react';
import { Eye, Send, CheckCircle, Search, Link, RotateCcw, X, Filter } from 'lucide-react';
import { GCClass } from '../lib/classroom';
import { SoalanData } from '../lib/sheets';
import ColorfulSelect from './ColorfulSelect';
import { createAssignment } from '../lib/classroom';

interface BankSoalanProps {
  user: any;
  questions: SoalanData[];
  classes: GCClass[];
  token: string | null;
  assignmentStatus: Record<string, any>;
  loadAssignmentStatus: () => void;
  spreadsheetId: string;
  gasWebAppUrl: string;
  onEditQuestion: (q: SoalanData) => void;
}

export default function BankSoalan({ 
  user, 
  questions, 
  classes, 
  token, 
  assignmentStatus, 
  loadAssignmentStatus,
  spreadsheetId,
  gasWebAppUrl,
  onEditQuestion 
}: BankSoalanProps) {
  const [search, setSearch] = useState('');
  const [filterSubjek, setFilterSubjek] = useState('');
  const [filterTingkatan, setFilterTingkatan] = useState('');
  const [previewQuestion, setPreviewQuestion] = useState<SoalanData | null>(null);
  
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendQ, setSendQ] = useState<SoalanData | null>(null);
  const [sendForm, setSendForm] = useState({
    title: '',
    description: '',
    points: 100,
    courseIds: [] as string[]
  });
  
  const [loadingQ, setLoadingQ] = useState<Record<string, boolean>>({});
  const [loadingMulti, setLoadingMulti] = useState(false);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const qBab = q.bab?.toLowerCase() || '';
      const qSubjek = q.subjek?.toLowerCase() || '';
      const s = search.toLowerCase();
      
      const matchSearch = qBab.includes(s) || qSubjek.includes(s);
      const matchSubjek = filterSubjek ? q.subjek === filterSubjek : true;
      const matchTingkatan = filterTingkatan ? q.tingkatan === filterTingkatan : true;
      
      return matchSearch && matchSubjek && matchTingkatan;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [questions, search, filterSubjek, filterTingkatan]);

  const uniqueSubjek = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => {
      if (q.subjek) set.add(q.subjek);
    });
    return Array.from(set).sort();
  }, [questions]);

  const uniqueTingkatan = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => {
      if (q.tingkatan) set.add(q.tingkatan);
    });
    return Array.from(set).sort();
  }, [questions]);

  const openSendModal = (q: SoalanData) => {
    setSendQ(q);
    setSendForm({
      title: \`Kuiz Interaktif: \${q.bab} (\${q.subjek})\`,
      description: \`Sila jawab soalan interaktif ini. Markah anda akan direkod secara automatik.\\n\\nArahan:\\n1. Klik pautan di bawah.\\n2. Selesaikan semua soalan.\\n3. Markah anda akan dihantar terus ke sistem.\`,
      points: 100,
      courseIds: []
    });
    setShowSendModal(true);
  };

  const handleSendToGCMulti = async () => {
    if (!token || !sendQ || sendForm.courseIds.length === 0) {
      alert('Sila log masuk ke Google Classroom dan pilih sekurang-kurangnya satu kelas.');
      return;
    }
    
    setLoadingMulti(true);
    try {
      // Loop createAssignment for all selected courseIds
      for (const courseId of sendForm.courseIds) {
        let qs = \`?qid=\${sendQ.idSoalan}\`;
        if (spreadsheetId) qs += \`&spreadsheetId=\${spreadsheetId}\`;
        if (gasWebAppUrl) qs += \`&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
        
        const link = gasWebAppUrl 
          ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${sendQ.idSoalan}\`
          : \`\${window.location.origin}/\${qs}\`;
          
        await createAssignment(token, courseId, {
          title: sendForm.title,
          description: sendForm.description,
          points: sendForm.points,
          link: link
        });
      }
      alert('Tugasan berjaya dihantar ke kelas yang dipilih!');
      setShowSendModal(false);
      loadAssignmentStatus();
    } catch (err: any) {
      alert('Ralat semasa menghantar tugasan: ' + err.message);
    } finally {
      setLoadingMulti(false);
    }
  };

  const handleResetStatus = (qid: string) => {
    if (confirm('Adakah anda pasti mahu set semula status tugasan ini?')) {
      alert('Fungsi ini belum disokong sepenuhnya oleh API, tetapi akan mengemaskini status lokal.');
      loadAssignmentStatus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative z-0 pb-10">
      <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col relative">
        <div className="bg-white p-5 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan bab atau subjek..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm outline-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48 relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <select 
                value={filterSubjek} 
                onChange={e => setFilterSubjek(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none text-sm outline-none cursor-pointer"
              >
                <option value="">Semua Subjek</option>
                {uniqueSubjek.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48 relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <select 
                value={filterTingkatan} 
                onChange={e => setFilterTingkatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none text-sm outline-none cursor-pointer"
              >
                <option value="">Semua Tingkatan</option>
                {uniqueTingkatan.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-800 font-bold text-lg mb-2">Tiada Soalan Dijumpai</h3>
              <p className="text-slate-600 text-center max-w-xl text-[15px] leading-relaxed">
                Tiada soalan yang sepadan dengan pilihan anda. Sila ubah tapisan atau jana soalan baru di bahagian Bina Soalan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredQuestions.map(q => {
                const status = assignmentStatus[q.idSoalan];
                const isPosted = status?.status === 'posted';
                return (
                  <div key={q.idSoalan} className={\`rounded-2xl border-2 transition-all duration-300 flex flex-col h-full \${isPosted ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300'}\`}>
                    <div className="aspect-video w-full bg-slate-100 relative rounded-t-2xl overflow-hidden shrink-0">
                      <iframe 
                        srcDoc={q.html} 
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                      />
                      <div className="absolute inset-0 bg-transparent pointer-events-auto"></div>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <div className="text-[10px] font-bold text-blue-600 mb-1">{q.tingkatan} • {q.subjek}</div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1.5 line-clamp-2 leading-tight">{q.bab}</h4>
                      <p className="text-[10px] text-slate-500 mb-3 leading-tight line-clamp-2">SP: {q.sp} • Dicipta oleh {q.namaGuru}</p>
                      
                      <div className="mt-auto space-y-2">
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
                        )}
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
                className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-200"
                sandbox="allow-scripts allow-same-origin"
                title="Pratonton Soalan"
              />
            </div>
            
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">Mod Pratonton: Anda boleh mencuba menjawab soalan ini untuk pengujian.</span>
              <button 
                onClick={() => setPreviewQuestion(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/BankSoalan.tsx', code);
