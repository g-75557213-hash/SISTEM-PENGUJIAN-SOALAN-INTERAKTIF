import React, { useState, useMemo } from 'react';
import { Eye, Send, CheckCircle, Search, Link, RotateCcw, X, Filter, Globe, Copy, ExternalLink, Sparkles, Trash2, Code2 } from 'lucide-react';
import { GCClass } from '../lib/classroom';
import { SoalanData, saveTugasanToSheets, readTugasanLink, updateTugasanStatus, deleteTugasanAndScoresFromSheets, ensureTugasanUmumSheet, saveTugasanUmumRowToSheet, getTugasanUmumRowsFromSheet, deleteTugasanUmumRowFromSheet } from '../lib/sheets';
import ColorfulSelect from './ColorfulSelect';
import { createAssignment, deleteAssignment } from '../lib/classroom';
import { logout } from '../lib/firebase';
import WaygroundSection from './WaygroundSection';
import GoogleSitesModal from './GoogleSitesModal';

interface BankSoalanProps {
  user: any;
  questions: SoalanData[];
  classes: GCClass[];
  token: string | null;
  assignmentStatus: Record<string, any>;
  loadAssignmentStatus: () => void;
  setAssignmentStatus?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
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
  setAssignmentStatus,
  spreadsheetId,
  gasWebAppUrl,
  onEditQuestion 
}: BankSoalanProps) {
  const [search, setSearch] = useState('');
  const [selectedSubjek, setSelectedSubjek] = useState('');
  const [selectedTingkatan, setSelectedTingkatan] = useState('');
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

  const [waPopupQ, setWaPopupQ] = useState<{ q: SoalanData; status: any } | null>(null);

  // Tugasan Umum (Tanpa Google Classroom) states
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [publicModalQ, setPublicModalQ] = useState<SoalanData | null>(null);
  const [publicKelasInput, setPublicKelasInput] = useState('');
  const [publicGeneratedKod, setPublicGeneratedKod] = useState('');
  const [publicGeneratedLink, setPublicGeneratedLink] = useState('');
  const [publicExistingList, setPublicExistingList] = useState<any[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [copiedPublicWa, setCopiedPublicWa] = useState(false);
  const [deletingPublicKod, setDeletingPublicKod] = useState<string | null>(null);

  // Google Sites Integration states
  const [showGoogleSitesModal, setShowGoogleSitesModal] = useState(false);
  const [googleSitesQ, setGoogleSitesQ] = useState<SoalanData | null>(null);

  const handleOpenGoogleSitesModal = (q: SoalanData) => {
    setGoogleSitesQ(q);
    setShowGoogleSitesModal(true);
  };

  const handleOpenPublicModal = async (q: SoalanData) => {
    setPublicModalQ(q);
    setPublicKelasInput('');
    setCopiedPublicLink(false);
    setCopiedPublicWa(false);
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const defaultKod = `TU-${randomSuffix}`;
    setPublicGeneratedKod(defaultKod);
    setPublicGeneratedLink('');
    setShowPublicModal(true);

    // 1. Immediately populate from local cache if present
    try {
      const stored = localStorage.getItem('sistem_tugasan_umum_list');
      if (stored) {
        const localList: any[] = JSON.parse(stored);
        const forThisQ = localList.filter(item => item.qid === q.idSoalan);
        if (forThisQ.length > 0) {
          setPublicExistingList(forThisQ);
        }
      }
    } catch (e) {
      console.warn("Ralat membaca localStorage tugasan umum:", e);
    }

    // 2. Fetch server and Google Sheets TUGASAN UMUM data and merge
    try {
      setIsLoadingPublic(true);
      const res = await fetch(`/api/tugasan-umum?qid=${encodeURIComponent(q.idSoalan)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const map = new Map<string, any>();
          try {
            const stored = localStorage.getItem('sistem_tugasan_umum_list');
            if (stored) {
              const localList: any[] = JSON.parse(stored);
              localList.filter(item => item.qid === q.idSoalan).forEach(item => map.set(item.kod, item));
            }
          } catch (e) {}
          data.forEach(item => map.set(item.kod, item));
          setPublicExistingList(Array.from(map.values()));
        }
      }

      // Merge from teacher's Google Sheets "TUGASAN UMUM" tab
      if (token && spreadsheetId) {
        try {
          const sheetItems = await getTugasanUmumRowsFromSheet(token, spreadsheetId);
          const forThisQ = sheetItems.filter(item => item.qid === q.idSoalan);
          if (forThisQ.length > 0) {
            setPublicExistingList(prev => {
              const map = new Map<string, any>();
              prev.forEach(p => map.set(p.kod, p));
              forThisQ.forEach(s => {
                if (!map.has(s.kod)) {
                  map.set(s.kod, {
                    kod: s.kod,
                    qid: s.qid,
                    kelas: s.kelas,
                    linkSoalan: s.link,
                    createdAt: 'Google Sheets'
                  });
                }
              });
              return Array.from(map.values());
            });
          }
        } catch (eSheet) {
          console.warn("Gagal membaca dari helaian TUGASAN UMUM:", eSheet);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat turun senarai dari pelayan, menggunakan simpanan tempatan:", err);
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const getPublicQuizUrl = (qid: string, kod: string, kelas: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?qid=${encodeURIComponent(qid)}&kod=${encodeURIComponent(kod)}&kelas=${encodeURIComponent(kelas)}&mod=umum`;
  };

  const handleCreatePublicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicModalQ || !publicKelasInput.trim()) {
      alert("Sila masukkan Nama Kelas.");
      return;
    }

    const finalKod = publicGeneratedKod.trim().toUpperCase() || `TU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const finalKelas = publicKelasInput.trim();

    // 1. GENERATE LINK IMMEDIATELY - Never fail or block the teacher!
    const generatedUrl = getPublicQuizUrl(publicModalQ.idSoalan, finalKod, finalKelas);
    setPublicGeneratedLink(generatedUrl);

    // 2. Save into local storage so it persists across refreshes and is accessible anywhere
    const newRecord = {
      kod: finalKod,
      qid: publicModalQ.idSoalan,
      soalanTajuk: publicModalQ.bab || publicModalQ.idSoalan,
      tingkatan: publicModalQ.tingkatan || '',
      subjek: publicModalQ.subjek || '',
      bab: publicModalQ.bab || '',
      kelas: finalKelas,
      guruEmail: user?.email || '',
      guruNama: user?.displayName || '',
      createdAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
    };

    try {
      const stored = localStorage.getItem('sistem_tugasan_umum_list');
      const list: any[] = stored ? JSON.parse(stored) : [];
      const updatedList = [newRecord, ...list.filter((item: any) => item.kod !== finalKod)];
      localStorage.setItem('sistem_tugasan_umum_list', JSON.stringify(updatedList));
      setPublicExistingList(prev => [newRecord, ...prev.filter(item => item.kod !== finalKod)]);
    } catch (e) {
      console.warn("Gagal simpan ke localStorage:", e);
    }

    // 3. Save 5 columns to tab TUGASAN UMUM in teacher's Google Spreadsheet:
    // [Kod Tugasan, ID Soalan, Kelas, Link tugasan umum, Nama Guru]
    if (token && spreadsheetId) {
      saveTugasanUmumRowToSheet(token, spreadsheetId, {
        kod: finalKod,
        qid: publicModalQ.idSoalan,
        kelas: finalKelas,
        link: generatedUrl,
        namaGuru: user?.displayName || user?.email || ''
      }).catch(errSheet => {
        console.warn("Gagal merekod ke tab TUGASAN UMUM Google Sheets:", errSheet);
      });
    }

    // 3. Sync to server in background
    try {
      setIsLoadingPublic(true);
      const res = await fetch('/api/tugasan-umum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kod: finalKod,
          qid: publicModalQ.idSoalan,
          soalanTajuk: publicModalQ.bab,
          tingkatan: publicModalQ.tingkatan,
          subjek: publicModalQ.subjek,
          bab: publicModalQ.bab,
          kelas: finalKelas,
          guruEmail: user?.email || '',
          guruNama: user?.displayName || ''
        })
      });

      if (res.ok) {
        try {
          const listRes = await fetch(`/api/tugasan-umum?qid=${encodeURIComponent(publicModalQ.idSoalan)}`);
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData) && listData.length > 0) {
              const map = new Map<string, any>();
              [newRecord, ...listData].forEach(item => map.set(item.kod, item));
              setPublicExistingList(Array.from(map.values()));
            }
          }
        } catch (e) {}
      } else {
        console.warn("Server backend sync status non-ok, using verified local record.");
      }
    } catch (err) {
      console.warn("Backend sync notice (assignment saved in local session):", err);
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const qBab = q.bab?.toLowerCase() || '';
      const s = search.toLowerCase();
      const matchSearch = qBab.includes(s);
      const matchSubjek = selectedSubjek ? q.subjek === selectedSubjek : true;
      const matchTingkatan = selectedTingkatan ? q.tingkatan === selectedTingkatan : true;
      
      return matchSearch && matchSubjek && matchTingkatan;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [questions, search, selectedSubjek, selectedTingkatan]);

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
      title: `Kuiz Interaktif: ${q.bab} (${q.subjek})`,
      description: `Sila jawab soalan interaktif ini. Markah anda akan direkod secara automatik.\n\nArahan:\n1. Klik pautan di bawah.\n2. Selesaikan semua soalan.\n3. Markah anda akan dihantar terus ke sistem.`,
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
      const assignmentsCreated = [];
      // Loop createAssignment for all selected courseIds
      for (const courseId of sendForm.courseIds) {
        // Cari nama kelas
        const matchedClass = classes.find(c => c.id === courseId);
        const className = matchedClass ? matchedClass.name : courseId;
        
        let linkToUse = '';
        
        // 1. Fill sheet "TUGASAN" first
        const savedData = await saveTugasanToSheets(
          token,
          spreadsheetId,
          className,
          sendQ.idSoalan,
          sendForm.title,
          user.name || user.email
        );
        
        let rowNum = null;
        let uniqueCode = '';
        if (savedData) {
          rowNum = savedData.rowNum;
          uniqueCode = savedData.uniqueCode;
          // Wait 2.5 seconds to allow Google Sheets formula to generate the link in column G
          await new Promise(r => setTimeout(r, 2500));
          
          // 2. Read the generated link
          const readLink = await readTugasanLink(token, spreadsheetId, rowNum);
          if (readLink) {
            linkToUse = readLink;
          }
        }
        
        // Fallback if writing failed or link wasn't generated
        if (!linkToUse) {
          let qs = `?qid=${sendQ.idSoalan}`;
          if (spreadsheetId) qs += `&spreadsheetId=${spreadsheetId}`;
          if (gasWebAppUrl) qs += `&gasWebAppUrl=${encodeURIComponent(gasWebAppUrl)}`;
          if (uniqueCode) qs += `&kod=${encodeURIComponent(uniqueCode)}`;
          qs += `&kelas=${encodeURIComponent(className)}&tugasan=${encodeURIComponent(sendForm.title)}`;
          
          linkToUse = (sendQ.linkSoalan && sendQ.linkSoalan.startsWith('http')) ? sendQ.linkSoalan : (gasWebAppUrl 
            ? `${gasWebAppUrl}${gasWebAppUrl.includes('?') ? '&' : '?'}qid=${sendQ.idSoalan}&kelas=${encodeURIComponent(className)}&tugasan=${encodeURIComponent(sendForm.title)}${uniqueCode ? '&kod=' + encodeURIComponent(uniqueCode) : ''}`
            : `${window.location.origin}/${qs}`);
        }
          
        // 3. Post to Classroom
        const assignment = await createAssignment(token, courseId, sendForm.title, sendForm.description, linkToUse, { maxPoints: sendForm.points });
        
        // 4. Update the "TUGASAN" sheet
        if (rowNum) {
          await updateTugasanStatus(token, spreadsheetId, rowNum, "Telah Di-Post", courseId, assignment.id);
        }
        
        assignmentsCreated.push({
          courseId,
          courseWorkId: assignment.id,
          alternateLink: assignment.alternateLink,
          title: sendForm.title
        });
      }
      
      await fetch('/api/assignment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qid: sendQ.idSoalan,
          email: user.email,
          title: sendForm.title,
          assignments: assignmentsCreated
        })
      });
      
      // Kemaskini status secara optimistik di UI untuk respons visual yang pantas
      if (setAssignmentStatus) {
        setAssignmentStatus(prev => {
          const existing = prev[sendQ.idSoalan] || {};
          const existingAsgns = existing.assignments || [];
          const combined = [...existingAsgns];
          assignmentsCreated.forEach(a => {
            if (!combined.some(x => x.courseId === a.courseId)) {
              combined.push(a);
            }
          });
          return {
            ...prev,
            [sendQ.idSoalan]: {
              qid: sendQ.idSoalan,
              email: user.email,
              assignments: combined,
              status: "posted"
            }
          };
        });
      }

      alert('Tugasan berjaya dihantar ke kelas yang dipilih!');
      setShowSendModal(false);
      loadAssignmentStatus();
    } catch (err: any) {
      if (err.message === 'UNAUTHENTICATED') {
        alert('Sesi anda telah tamat. Sila log masuk semula.');
        logout();
        return;
      }
      alert('Ralat semasa menghantar tugasan: ' + err.message);
    } finally {
      setLoadingMulti(false);
    }
  };

  const handleResetStatus = async (qid: string) => {
    if (confirm('Adakah anda pasti mahu memadam tugasan ini dari Google Classroom dan set semula status?')) {
      const status = assignmentStatus[qid];
      if (status && status.assignments && token) {
        setLoadingQ(prev => ({ ...prev, [qid]: true }));
        try {
          // Delete from Google Classroom
          for (const a of status.assignments) {
            try {
              await deleteAssignment(token, a.courseId, a.courseWorkId);
            } catch (err) {
              console.error('Error deleting from Classroom:', err);
            }
          }
          // Delete from local DB
          await fetch(`/api/assignment-status/${qid}_${user.email}`, { method: 'DELETE' });
          
          // Delete from Google Sheets (TUGASAN and Markah Murid)
          try {
            await deleteTugasanAndScoresFromSheets(token, spreadsheetId, qid);
          } catch (e) {
            console.error("Gagal padam rekod spreadsheet:", e);
          }

          // Optimistik kemaskini di UI untuk respons segera
          if (setAssignmentStatus) {
            setAssignmentStatus(prev => {
              const updated = { ...prev };
              delete updated[qid];
              return updated;
            });
          }

          alert('Tugasan telah berjaya dipadam dari Google Classroom.');
          loadAssignmentStatus();
        } catch (err: any) {
          if (err.message === 'UNAUTHENTICATED') {
            alert('Sesi anda telah tamat. Sila log masuk semula.');
            logout();
            return;
          }
          alert('Ralat memadam tugasan: ' + err.message);
        } finally {
          setLoadingQ(prev => ({ ...prev, [qid]: false }));
        }
      } else {
        alert('Tugasan tidak dijumpai atau anda perlu log masuk ke Google Classroom semula.');
      }
    }
  };

  const handleResetSingleClassStatus = async (qid: string, courseId: string, courseWorkId: string, className: string) => {
    if (confirm(`Adakah anda pasti mahu memadam tugasan ini dari Google Classroom untuk kelas "${className}" sahaja?`)) {
      if (token) {
        setLoadingQ(prev => ({ ...prev, [qid]: true }));
        try {
          // 1. Delete from Google Classroom
          try {
            await deleteAssignment(token, courseId, courseWorkId);
          } catch (err) {
            console.error('Error deleting single assignment from Classroom:', err);
          }
          // 2. Remove specific assignment from Firestore document
          await fetch('/api/assignment-status/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qid, email: user.email, courseId })
          });
          
          // Delete from Google Sheets (TUGASAN and Markah Murid) for this single class
          try {
            await deleteTugasanAndScoresFromSheets(token, spreadsheetId, qid, courseId, courseWorkId);
          } catch (e) {
            console.error("Gagal padam rekod spreadsheet kelas:", e);
          }

          // Optimistik kemaskini di UI untuk respons segera
          if (setAssignmentStatus) {
            setAssignmentStatus(prev => {
              const current = prev[qid];
              if (!current) return prev;
              const remaining = (current.assignments || []).filter((a: any) => a.courseId !== courseId);
              if (remaining.length === 0) {
                const updated = { ...prev };
                delete updated[qid];
                return updated;
              }
              return {
                ...prev,
                [qid]: {
                  ...current,
                  assignments: remaining
                }
              };
            });
          }
          
          alert(`Tugasan untuk kelas "${className}" telah berjaya dipadam.`);
          loadAssignmentStatus();
        } catch (err: any) {
          if (err.message === 'UNAUTHENTICATED') {
            alert('Sesi anda telah tamat. Sila log masuk semula.');
            logout();
            return;
          }
          alert('Ralat memadam tugasan kelas: ' + err.message);
        } finally {
          setLoadingQ(prev => ({ ...prev, [qid]: false }));
        }
      } else {
        alert('Sila log masuk ke Google Classroom semula.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative z-0 pb-10">
      <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col relative">
        <WaygroundSection token={token} classes={classes} spreadsheetId={spreadsheetId} />
        

        {!selectedSubjek ? (
          <div className="flex-1 mt-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-blue-600 font-bold">1</span></div> Pilih Subjek</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {uniqueSubjek.length > 0 ? uniqueSubjek.map(s => (
                <button 
                  key={s}
                  onClick={() => setSelectedSubjek(s)}
                  className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl transition-colors">
                    {s.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-700 text-center">{s}</span>
                </button>
              )) : (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                  Tiada subjek tersedia. Sila cipta soalan baru.
                </div>
              )}
            </div>
          </div>
        ) : !selectedTingkatan ? (
          <div className="flex-1 mt-4">
            <div className="flex items-center gap-4 mb-6">
               <button onClick={() => setSelectedSubjek('')} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition">← Kembali</button>
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><span className="text-purple-600 font-bold">2</span></div> Pilih Tingkatan untuk {selectedSubjek}</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {uniqueTingkatan.length > 0 ? uniqueTingkatan.map(t => (
                <button 
                  key={t}
                  onClick={() => setSelectedTingkatan(t)}
                  className="bg-white border-2 border-slate-200 hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md group"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl transition-colors">
                    {t.replace(/[^0-9]/g, '') || t.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-700 text-center">{t}</span>
                </button>
              )) : (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                  Tiada tingkatan tersedia untuk {selectedSubjek}.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 mt-4 flex flex-col">
            <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-wrap">
               <button onClick={() => setSelectedTingkatan('')} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition shrink-0">← Kembali</button>
               <div className="flex items-center gap-2 text-sm font-bold text-slate-600 shrink-0">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{selectedSubjek}</span>
                  <span>/</span>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">{selectedTingkatan}</span>
               </div>
               
               <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari berdasarkan bab..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm outline-none"
                  />
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
                    Tiada soalan yang sepadan dengan carian anda dalam kategori ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredQuestions.map(q => {
                const status = assignmentStatus[q.idSoalan];
                const isPosted = status?.status === 'posted';
                return (
                  <div key={q.idSoalan} className={`rounded-2xl border-2 transition-all duration-300 flex flex-col h-full ${isPosted ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300'}`}>
                    <div 
                      className="aspect-video w-full bg-slate-100 relative rounded-t-2xl overflow-hidden shrink-0 cursor-pointer group"
                      onClick={() => setPreviewQuestion(q)}
                      title="Tekan untuk pratonton soalan"
                    >
                      <iframe 
                        srcDoc={q.html.replace('<style>', '<style>body{overflow-x:hidden !important; margin:0; padding:0;}</style><style>')} 
                        className="w-full h-full border-0 pointer-events-none transition-transform duration-300 group-hover:scale-105 origin-top"
                        sandbox="allow-scripts"
                        scrolling="no"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-auto flex items-center justify-center">
                        <div className="bg-white text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 shadow-sm flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          Pratonton
                        </div>
                      </div>
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
                              onClick={() => handleOpenPublicModal(q)}
                              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-sm cursor-pointer"
                            >
                              <Globe className="w-3.5 h-3.5 mr-1.5" />
                              Link Tugasan Umum (Tanpa GC)
                            </button>
                            <button 
                              onClick={() => handleOpenGoogleSitesModal(q)}
                              className="w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 hover:from-blue-800 hover:to-indigo-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-sm cursor-pointer"
                              title="Jana kod embed HTML & pautan khas untuk Google Sites"
                            >
                              <Code2 className="w-3.5 h-3.5 mr-1.5" />
                              🌐 Embed Google Sites
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
                                  const directLink = (q.linkSoalan && q.linkSoalan.startsWith('http')) ? q.linkSoalan : (gasWebAppUrl 
                                    ? `${gasWebAppUrl}${gasWebAppUrl.includes('?') ? '&' : '?'}qid=${q.idSoalan}`
                                    : `${window.location.origin}/?qid=${q.idSoalan}&spreadsheetId=${spreadsheetId}&gasWebAppUrl=${encodeURIComponent(gasWebAppUrl)}`);
                                  navigator.clipboard.writeText(directLink);
                                  alert("Pautan terus murid berjaya disalin!");
                                }}
                                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center transition border border-slate-200 gap-1.5"
                                title="Salin pautan terus murid untuk dikongsi secara terus tanpa Google Classroom"
                              >
                                <Link className="w-3.5 h-3.5 text-slate-500" />
                                Salin Link
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative z-0 space-y-2">
                            <div className="w-full bg-emerald-50 text-emerald-700 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                              Dihantar ke Classroom
                            </div>

                            {/* LIST OF ASSIGNED CLASSES */}
                            {status?.assignments && status.assignments.length > 0 && (
                              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-xs text-slate-700 space-y-1.5">
                                <div className="font-semibold text-[10px] uppercase text-slate-500 tracking-wider">Senarai Kelas Terhantar:</div>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {status.assignments.map((a: any) => {
                                    const cls = classes.find(c => c.id === a.courseId);
                                    const clsName = cls ? cls.name : 'Kelas';
                                    return (
                                      <div key={a.courseId} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                        <span className="font-semibold text-slate-800 line-clamp-1 flex-1 pr-2 text-[11px]">{clsName}</span>
                                        <button
                                          onClick={() => handleResetSingleClassStatus(q.idSoalan, a.courseId, a.courseWorkId, clsName)}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition shrink-0"
                                          title={`Padam / Reset kelas ${clsName} sahaja`}
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <button 
                              onClick={() => handleOpenPublicModal(q)}
                              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-sm cursor-pointer"
                            >
                              <Globe className="w-3.5 h-3.5 mr-1.5" />
                              Link Tugasan Umum (Tanpa GC)
                            </button>
                            <button 
                              onClick={() => handleOpenGoogleSitesModal(q)}
                              className="w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 hover:from-blue-800 hover:to-indigo-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-sm cursor-pointer"
                              title="Jana kod embed HTML & pautan khas untuk Google Sites"
                            >
                              <Code2 className="w-3.5 h-3.5 mr-1.5" />
                              🌐 Embed Google Sites
                            </button>
                            <button 
                              onClick={() => openSendModal(q)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5 mr-1.5" />
                              Hantar ke Kelas Tambahan
                            </button>

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
                                  if (status?.assignments && status.assignments.length > 1) {
                                    setWaPopupQ({ q, status });
                                  } else {
                                    let namaTugasan = q.subjek ? `Kuiz Interaktif ${q.subjek}` : "Kuiz Interaktif";
                                    let linkTugasan = "(*MASUKKAN LINK TUGASAN GOOGLE CLASSROOM TERSEBUT DISINI*)";
                                    
                                    if (status?.title) {
                                      namaTugasan = status.title;
                                    } else if (status?.assignments && status.assignments.length > 0 && status.assignments[0].title) {
                                      namaTugasan = status.assignments[0].title;
                                    }
                                    
                                    if (status?.assignments && status.assignments.length === 1) {
                                      linkTugasan = status.assignments[0].alternateLink || `https://classroom.google.com/c/${status.assignments[0].courseId}/a/${status.assignments[0].courseWorkId}/details`;
                                    }

                                    const titleStr = `*TUGASAN KUIZ INTERAKTIF ${q.subjek ? q.subjek.toUpperCase() : ''} ${q.bab ? q.bab.toUpperCase() : ''} ${q.tingkatan ? q.tingkatan.toUpperCase() : ''}*`.replace(/\s+/g, ' ').trim();
                                    
                                    const text = `${titleStr}\nAssalammualaikum dan selamat sejahtera, mohon semua untuk lengkapkan tugasan ${namaTugasan}\n\nSila akses kuiz terus melalui pautan Google Classroom:\n${linkTugasan}\n\nSelamat Menjawab\nTerima kasih.`;
                                    navigator.clipboard.writeText(text);
                                    alert("Mesej pemberitahuan WhatsApp berjaya disalin!");
                                  }
                                }}
                                className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2 rounded-xl text-[10px] font-bold flex items-center justify-center transition shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5 fill-current mr-1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.587-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.57 1.977 14.093.953 11.5.953c-5.44 0-9.865 4.371-9.87 9.799-.002 1.944.512 3.84 1.488 5.534l-.979 3.575 3.666-.962zm10.844-7.46c-.298-.15-1.766-.87-2.04-.97-.272-.1-.471-.15-.67.15-.198.3-.77.97-.943 1.17-.173.2-.347.225-.645.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.67-1.61-.92-2.2-.24-.585-.48-.5-.67-.51-.172-.01-.37-.01-.568-.01-.199 0-.52.075-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.766-.72 2.015-1.417.25-.697.25-1.294.175-1.417-.075-.125-.272-.2-.57-.35z"/></svg>
                                Salin WA
                              </button>
                              <button 
                                onClick={() => handleResetStatus(q.idSoalan)}
                                className="flex-1 bg-white hover:bg-red-50 text-[#991b1b] py-2 rounded-xl text-[10px] font-bold flex items-center justify-center transition border border-[#fca5a5] shadow-sm"
                                title="Set semula tugasan bagi SEMUA kelas"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                RESET SEMUA
                              </button>
                            </div>
                            
                            <button 
                              onClick={() => {
                                const directLink = (q.linkSoalan && q.linkSoalan.startsWith('http')) ? q.linkSoalan : (gasWebAppUrl 
                                    ? `${gasWebAppUrl}${gasWebAppUrl.includes('?') ? '&' : '?'}qid=${q.idSoalan}`
                                    : `${window.location.origin}/?qid=${q.idSoalan}&spreadsheetId=${spreadsheetId}&gasWebAppUrl=${encodeURIComponent(gasWebAppUrl)}`);
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
        )}
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
                  {classes.map(c => {
                    const status = assignmentStatus[sendQ?.idSoalan || ''];
                    const alreadyAssigned = status?.assignments?.some((a: any) => a.courseId === c.id);
                    return (
                      <label key={c.id} className={`flex items-center p-3 border rounded-xl transition ${alreadyAssigned ? 'bg-emerald-50/50 border-emerald-100 cursor-not-allowed opacity-75' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'}`}>
                        <input 
                          type="checkbox"
                          disabled={alreadyAssigned}
                          checked={alreadyAssigned || sendForm.courseIds.includes(c.id)}
                          onChange={(e) => {
                            if (alreadyAssigned) return;
                            setSendForm(prev => {
                              if (e.target.checked) return { ...prev, courseIds: [...prev.courseIds, c.id] };
                              return { ...prev, courseIds: prev.courseIds.filter(id => id !== c.id) };
                            });
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-3 text-sm font-medium text-slate-700 line-clamp-1 flex-1">{c.name}</span>
                        {alreadyAssigned && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            Telah Dihantar
                          </span>
                        )}
                      </label>
                    );
                  })}
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-0 z-[100]">
          <div className="bg-white rounded-none w-full max-w-none h-screen overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Pratonton: {previewQuestion.bab}
              </h3>
              <button onClick={() => setPreviewQuestion(null)} className="text-slate-300 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 bg-slate-100 p-0 relative overflow-hidden">
              <iframe 
                srcDoc={(() => {
                  const scriptToInject = `
                    <script>
                      window.USER_EMAIL = "${user?.email || 'guru@moe-dl.edu.my'}";
                      window.USER_NAME = "${user?.displayName || 'Guru Test'}";
                      window.PREVIEW_MODE = true;
                    </script>
                  `;
                  let resultHtml = previewQuestion.html.replace('</head>', `${scriptToInject}</head>`);
                  // Inject CSS to hide horizontal scroll
                  resultHtml = resultHtml.replace('<style>', '<style>body{overflow-x:hidden !important; max-width: 100vw; margin:0; padding:0; box-sizing:border-box;} *{box-sizing:border-box;}</style><style>');
                  return resultHtml;
               })()}
                className="w-full h-full bg-white border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
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
      {/* WA Modal */}
      {waPopupQ && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#25D366] px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center">
                <svg className="w-5 h-5 fill-current mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.587-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.57 1.977 14.093.953 11.5.953c-5.44 0-9.865 4.371-9.87 9.799-.002 1.944.512 3.84 1.488 5.534l-.979 3.575 3.666-.962zm10.844-7.46c-.298-.15-1.766-.87-2.04-.97-.272-.1-.471-.15-.67.15-.198.3-.77.97-.943 1.17-.173.2-.347.225-.645.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.67-1.61-.92-2.2-.24-.585-.48-.5-.67-.51-.172-.01-.37-.01-.568-.01-.199 0-.52.075-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.766-.72 2.015-1.417.25-.697.25-1.294.175-1.417-.075-.125-.272-.2-.57-.35z"/></svg>
                Pilih Kelas untuk WA
              </h3>
              <button onClick={() => setWaPopupQ(null)} className="text-white hover:text-green-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">Sila pilih kelas untuk mendapatkan pautan tugasan bagi kelas tersebut.</p>
              <div className="space-y-2">
                {waPopupQ.status.assignments.map((a: any) => {
                  const cls = classes.find(c => c.id === a.courseId);
                  const clsName = cls ? cls.name : 'Kelas';
                  const link = a.alternateLink || `https://classroom.google.com/c/${a.courseId}/a/${a.courseWorkId}/details`;
                  return (
                    <button
                      key={a.courseId}
                      onClick={() => {
                        let namaTugasan = waPopupQ.q.subjek ? `Kuiz Interaktif ${waPopupQ.q.subjek}` : "Kuiz Interaktif";
                        if (a.title) namaTugasan = a.title;
                        else if (waPopupQ.status.title) namaTugasan = waPopupQ.status.title;

                        const titleStr = `*TUGASAN KUIZ INTERAKTIF ${waPopupQ.q.subjek ? waPopupQ.q.subjek.toUpperCase() : ''} ${waPopupQ.q.bab ? waPopupQ.q.bab.toUpperCase() : ''} ${waPopupQ.q.tingkatan ? waPopupQ.q.tingkatan.toUpperCase() : ''}*`.replace(/\s+/g, ' ').trim();
                                    
                        const text = `${titleStr}\nAssalammualaikum dan selamat sejahtera, mohon murid kelas *${clsName}* untuk lengkapkan tugasan ${namaTugasan}\n\nSila akses kuiz terus melalui pautan Google Classroom:\n${link}\n\nSelamat Menjawab\nTerima kasih.`;
                        navigator.clipboard.writeText(text);
                        alert(`Mesej pemberitahuan WhatsApp untuk kelas ${clsName} berjaya disalin!`);
                        setWaPopupQ(null);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-[#25D366] hover:bg-green-50 transition flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">{clsName}</span>
                      <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">Salin Pautan</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TUGASAN UMUM (TANPA GOOGLE CLASSROOM) */}
      {showPublicModal && publicModalQ && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col my-8 border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white text-xl">
                  🌐
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Link Tugasan Umum (Tanpa Classroom)</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Pelajar hanya perlu isi <span className="font-bold underline">Nama Penuh</span> & <span className="font-bold underline">Kelas</span> sahaja untuk menjawab.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPublicModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Question Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  {publicModalQ.tingkatan} • {publicModalQ.subjek}
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm leading-snug">
                  {publicModalQ.bab}
                </h4>
                <div className="text-[11px] text-slate-500 mt-1">
                  ID Soalan: <span className="font-mono text-slate-700 font-bold">{publicModalQ.idSoalan}</span>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleCreatePublicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Kelas Sasaran <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={publicKelasInput}
                    onChange={(e) => setPublicKelasInput(e.target.value)}
                    placeholder="Contoh: 5 CEMERLANG / 4 SAINS 1 / 3 ARIF"
                    className="w-full px-4 py-3 text-sm border-2 border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 outline-none uppercase placeholder:text-slate-400 placeholder:font-normal"
                    autoFocus
                  />
                  {classes && classes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-400 font-bold mr-1">Pilih Cepat:</span>
                      {classes.slice(0, 6).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPublicKelasInput(c.name)}
                          className="text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-600 font-bold px-2 py-1 rounded-md border border-slate-200 transition"
                        >
                          + {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kod Tugasan (Dijana Automatik)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      required
                      value={publicGeneratedKod}
                      onChange={(e) => setPublicGeneratedKod(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-2.5 font-mono text-sm border border-slate-300 rounded-xl font-bold text-emerald-800 bg-emerald-50/50 uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
                        setPublicGeneratedKod(`TU-${randomSuffix}`);
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
                      title="Jana kod baru"
                    >
                      Tukar Kod
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kod unik ini digunakan untuk mengasingkan rekod markah murid bagi kelas ini di bahagian Semakan Guru.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingPublic || !publicKelasInput.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>{isLoadingPublic ? 'Menjana...' : 'Jana Pautan Tugasan Umum'}</span>
                </button>
              </form>

              {/* Generated Result */}
              {publicGeneratedLink && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4.5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Pautan Sedia Digunakan!
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">
                      {publicGeneratedKod}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-emerald-200 shadow-xs">
                    <input 
                      type="text" 
                      readOnly 
                      value={publicGeneratedLink}
                      className="w-full font-mono text-xs text-slate-700 bg-transparent outline-none select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                    <span className="text-base shrink-0">💡</span>
                    <div>
                      <span className="font-bold">Akses Tanpa Login (Mod Guest):</span> Pautan ini menggunakan Web App Google Apps Script. Pastikan di Apps Script, tetapan Deploy ditetapkan kepada:
                      <div className="font-semibold mt-0.5">• Execute as: <span className="underline">Me</span> (Akaun Guru)</div>
                      <div className="font-semibold">• Who has access: <span className="underline">Anyone</span> (Sesiapa sahaja)</div>
                      Dengan ini, murid di mana-mana peranti boleh terus menjawab tanpa log masuk Google.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(publicGeneratedLink);
                        setCopiedPublicLink(true);
                        setTimeout(() => setCopiedPublicLink(false), 2500);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedPublicLink ? '✓ Pautan Disalin!' : 'Salin Pautan Tugasan'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const titleStr = `*TUGASAN KUIZ INTERAKTIF: ${publicModalQ.subjek.toUpperCase()} (${publicModalQ.tingkatan.toUpperCase()})*`;
                        const text = `${titleStr}\n\nAssalammualaikum & Salam Sejahtera,\nMurid kelas *${publicKelasInput.toUpperCase()}* diminta menjawab tugasan kuiz berikut:\n\n📖 *Topik:* ${publicModalQ.bab}\n🔑 *Kod Tugasan:* ${publicGeneratedKod}\n\n👉 *Pautan Tugasan:*\n${publicGeneratedLink}\n\n✨ *PERHATIAN MURID:*\n✅ TIDAK PERLU LOG MASUK CHROME ATAU AKAUN GOOGLE.\n✅ Hanya masukkan NAMA PENUH dan KELAS sahaja untuk menjawab.\n\nMarkah anda akan direkodkan terus kepada guru.\nSelamat menjawab! Terima kasih.`;
                        navigator.clipboard.writeText(text);
                        setCopiedPublicWa(true);
                        setTimeout(() => setCopiedPublicWa(false), 2500);
                      }}
                      className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <span>💬</span>
                      <span>{copiedPublicWa ? '✓ Teks WA Disalin!' : 'Salin Mesej WhatsApp'}</span>
                    </button>

                    <a 
                      href={publicGeneratedLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                      title="Uji pautan di tab baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    </a>
                  </div>
                </div>
              )}

              {/* Previously Created Links for this question */}
              {publicExistingList.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Senarai Pautan Tugasan Kelas Sedia Ada ({publicExistingList.length}):</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {publicExistingList.map((item, idx) => {
                      const itemUrl = getPublicQuizUrl(item.qid, item.kod, item.kelas);
                      return (
                        <div key={item.kod || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800">{item.kelas}</span>
                              <span className="font-mono text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                                {item.kod}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              Dicipta: {item.createdAt || 'Baru ini'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(itemUrl);
                                alert(`Pautan bagi kelas ${item.kelas} berjaya disalin!`);
                              }}
                              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 px-2.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </button>
                            <button
                              type="button"
                              disabled={deletingPublicKod === item.kod}
                              onClick={async () => {
                                const kodToDelete = (item.kod || '').trim().toUpperCase();
                                if (!kodToDelete) return;

                                if (!confirm(`Padam rekod pautan bagi kelas ${item.kelas} (${kodToDelete})?\n\nTindakan ini akan memadamkan tugasan dari sistem, tab "TUGASAN UMUM" dan markah murid berkaitan dari Google Sheets.`)) {
                                  return;
                                }

                                setDeletingPublicKod(kodToDelete);
                                try {
                                  // 1. Padam dari localStorage
                                  try {
                                    const stored = localStorage.getItem('sistem_tugasan_umum_list');
                                    if (stored) {
                                      const filtered = JSON.parse(stored).filter((x: any) => (x.kod || '').toString().trim().toUpperCase() !== kodToDelete);
                                      localStorage.setItem('sistem_tugasan_umum_list', JSON.stringify(filtered));
                                    }
                                  } catch (e) {}

                                  // 2. Kemaskini senarai paparan
                                  setPublicExistingList(prev => prev.filter(x => (x.kod || '').toString().trim().toUpperCase() !== kodToDelete));

                                  // 3. Padam dari pelayan
                                  try {
                                    await fetch(`/api/tugasan-umum/${encodeURIComponent(kodToDelete)}`, { method: 'DELETE' });
                                  } catch (e) {}

                                  // 4. Padam dari Google Sheets (Wajib await!)
                                  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null);
                                  const activeSheetId = spreadsheetId || (typeof window !== 'undefined' ? localStorage.getItem('smkj_spreadsheet_id') : null) || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';

                                  let sheetStatus = '';
                                  if (activeToken && activeSheetId) {
                                    const delRes = await deleteTugasanUmumRowFromSheet(activeToken, activeSheetId, kodToDelete);
                                    if (delRes.success) {
                                      sheetStatus = `\n(Google Sheets: ${delRes.deletedUmumCount} baris tugasan dipadam)`;
                                    }
                                  }

                                  alert(`Rekod tugasan ${kodToDelete} berjaya dipadam dari sistem dan Google Sheets.${sheetStatus}`);
                                } catch (err) {
                                  console.error("Ralat padam pautan:", err);
                                  alert("Gagal memadam pautan.");
                                } finally {
                                  setDeletingPublicKod(null);
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-40"
                              title="Padam rekod pautan dari sistem & Google Sheets"
                            >
                              {deletingPublicKod === item.kod ? (
                                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowPublicModal(false)}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTEGRASI GOOGLE SITES */}
      <GoogleSitesModal
        isOpen={showGoogleSitesModal}
        onClose={() => setShowGoogleSitesModal(false)}
        question={googleSitesQ}
        classes={classes}
        token={token}
        spreadsheetId={spreadsheetId}
        user={user}
      />
    </div>
  );
}
