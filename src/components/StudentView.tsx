import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth, logout, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, UserCheck, CheckCircle2, Edit3, ArrowRight, ShieldCheck, AlertCircle, School, Hash, RefreshCw, KeyRound, Sparkles, Users } from 'lucide-react';

interface StudentViewProps {
  qid: string;
  kod?: string | null;
  kelasParam?: string | null;
  modParam?: string | null;
  courseId?: string | null;
  courseWorkId?: string | null;
  spreadsheetId?: string | null;
  gasWebAppUrl?: string | null;
}

interface RosterStudent {
  userId: string;
  fullName: string;
  email: string;
  photoUrl?: string;
}

export default function StudentView({ 
  qid, 
  kod: initialKod,
  kelasParam: initialKelas,
  modParam: initialMod,
  courseId: initialCourseId,
  courseWorkId: initialCourseWorkId,
  spreadsheetId, 
  gasWebAppUrl 
}: StudentViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // URL search params resolution
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentKod = initialKod || urlParams?.get('kod') || '';
  const currentKelasParam = initialKelas || urlParams?.get('kelas') || '';
  const currentCourseId = initialCourseId || urlParams?.get('courseId') || '';
  const currentCourseWorkId = initialCourseWorkId || urlParams?.get('courseWorkId') || '';
  const currentMod = initialMod || urlParams?.get('mod') || '';

  // Mode: Google Classroom Mode if mod === 'gc' or 'delima' or courseId is present
  const isGCMode = currentMod === 'gc' || currentMod === 'delima' || !!currentCourseId;

  // ==========================================
  // GOOGLE CLASSROOM INTEGRATION STATES
  // ==========================================
  const [classRoster, setClassRoster] = useState<RosterStudent[]>([]);
  const [courseName, setCourseName] = useState<string>(currentKelasParam || '');
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [detectedStudent, setDetectedStudent] = useState<{
    userId?: string;
    fullName: string;
    email: string;
    photoUrl?: string;
    isExactRosterMatch?: boolean;
  } | null>(null);

  interface MoeAccount {
    email: string;
    fullName: string;
    userId?: string;
    photoUrl?: string;
    isExactRosterMatch?: boolean;
  }

  const [moeAccounts, setMoeAccounts] = useState<MoeAccount[]>([]);
  const [isChoosingAccount, setIsChoosingAccount] = useState<boolean>(false);
  const [isDetectingAccount, setIsDetectingAccount] = useState<boolean>(false);

  const isTeacherEmail = (email: string) => {
    const e = (email || '').toLowerCase().trim();
    return e.startsWith('g-') || e.includes('guru');
  };

  const getStoredMoeAccounts = (): MoeAccount[] => {
    try {
      const raw = localStorage.getItem('known_moe_student_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  };

  const saveMoeAccount = (account: MoeAccount) => {
    try {
      const current = getStoredMoeAccounts();
      const cleanEmail = (account.email || '').toLowerCase().trim();
      if (!cleanEmail) return;
      const filtered = current.filter(a => (a.email || '').toLowerCase().trim() !== cleanEmail);
      const updated = [account, ...filtered].slice(0, 8);
      localStorage.setItem('known_moe_student_accounts', JSON.stringify(updated));
    } catch (e) {}
  };

  const [confirmedStudent, setConfirmedStudent] = useState<{
    userId?: string;
    nama: string;
    email: string;
    rawTypedName?: string;
    matchedClassroomName?: string;
    matchedStudentId?: string;
    verificationStatus: 'verified' | 'pending_teacher_approval';
    possibleMatches?: Array<{ userId: string; fullName: string; email: string }>;
  } | null>(null);

  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [manualInputName, setManualInputName] = useState('');
  const [fuzzyMatchesPreview, setFuzzyMatchesPreview] = useState<Array<{ student: RosterStudent; score: number }>>([]);

  // ==========================================
  // PUBLIC MODE (TUGASAN UMUM) STATES
  // ==========================================
  const [publicNama, setPublicNama] = useState('');
  const [publicKelas, setPublicKelas] = useState(currentKelasParam || '');
  const [isPublicStarted, setIsPublicStarted] = useState(false);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = initAuth((u) => {
      setUser(u);
    }, () => {
      setUser(null);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Classroom Roster if in GC Mode
  useEffect(() => {
    if (!isGCMode || !currentCourseId) return;

    const fetchRoster = async () => {
      try {
        setIsLoadingRoster(true);
        const res = await fetch(`/api/classroom-roster?courseId=${encodeURIComponent(currentCourseId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.students)) {
            setClassRoster(data.students);
          }
          if (data.courseName) {
            setCourseName(data.courseName);
          }
        }
      } catch (err) {
        console.warn("Notice fetching classroom roster:", err);
      } finally {
        setIsLoadingRoster(false);
      }
    };

    fetchRoster();
  }, [isGCMode, currentCourseId]);

  // Clean string helper for name normalization
  const normalize = (s: string) => {
    return (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Auto-detect and match Google account from Chrome/Browser
  useEffect(() => {
    if (!isGCMode) return;

    let stored = getStoredMoeAccounts();

    // If active user is signed in
    if (user) {
      const userEmail = (user.email || '').toLowerCase().trim();
      const userDisplay = (user.displayName || '').trim().toUpperCase();
      const isTeacher = isTeacherEmail(userEmail);

      // Only save if it is an actual student account (not a teacher)
      if (!isTeacher && userEmail) {
        let matched = classRoster.find(s => s.email && s.email.toLowerCase() === userEmail);
        if (!matched && userDisplay) {
          matched = classRoster.find(s => normalize(s.fullName) === normalize(userDisplay));
        }

        const studentAcc: MoeAccount = {
          email: userEmail,
          fullName: matched ? matched.fullName : (userDisplay || userEmail.split('@')[0].toUpperCase()),
          userId: matched ? matched.userId : user.uid,
          photoUrl: user.photoURL || matched?.photoUrl,
          isExactRosterMatch: !!matched
        };

        saveMoeAccount(studentAcc);
        stored = getStoredMoeAccounts();
      }
    }

    // Enrich stored accounts with classRoster details
    const enriched = stored.map(acc => {
      const rMatch = classRoster.find(s => s.email && s.email.toLowerCase() === acc.email.toLowerCase()) ||
                     classRoster.find(s => normalize(s.fullName) === normalize(acc.fullName));
      if (rMatch) {
        return {
          ...acc,
          fullName: rMatch.fullName,
          userId: rMatch.userId,
          photoUrl: acc.photoUrl || rMatch.photoUrl,
          isExactRosterMatch: true
        };
      }
      return acc;
    });

    setMoeAccounts(enriched);

    const activeEmail = (user?.email || '').toLowerCase().trim();
    const activeIsTeacher = isTeacherEmail(activeEmail);

    if (user && !activeIsTeacher) {
      // Current active Chrome user is a student: write their name directly!
      const matched = enriched.find(a => a.email.toLowerCase() === activeEmail) || {
        email: activeEmail,
        fullName: (user.displayName || activeEmail.split('@')[0]).toUpperCase(),
        userId: user.uid,
        photoUrl: user.photoURL,
        isExactRosterMatch: false
      };
      setDetectedStudent(matched);
      setIsChoosingAccount(false);
    } else {
      // Active user is teacher or not logged in
      if (enriched.length === 1) {
        // Exactly 1 student MOE account found on Chrome: write it directly for confirmation!
        setDetectedStudent(enriched[0]);
        setIsChoosingAccount(false);
      } else if (enriched.length >= 2) {
        // Multiple student accounts on this Chrome profile: show selection buttons!
        setDetectedStudent(null);
        setIsChoosingAccount(true);
      } else {
        setDetectedStudent(null);
        setIsChoosingAccount(false);
      }
    }
  }, [user, classRoster, isGCMode]);

  // Compute fuzzy matches whenever manual input name changes
  useEffect(() => {
    if (!manualInputName.trim() || classRoster.length === 0) {
      setFuzzyMatchesPreview([]);
      return;
    }

    const cleanInput = normalize(manualInputName);
    const inputWords = cleanInput.split(' ').filter(w => w.length >= 2);

    const scored = classRoster.map(s => {
      const cleanRosterName = normalize(s.fullName);
      const rosterWords = cleanRosterName.split(' ');

      if (cleanRosterName === cleanInput) {
        return { student: s, score: 100 };
      }

      let matches = 0;
      for (const w of inputWords) {
        if (rosterWords.some(rw => rw.includes(w) || w.includes(rw))) {
          matches++;
        }
      }

      let score = (matches / Math.max(inputWords.length, 1)) * 80;
      if (cleanRosterName.includes(cleanInput)) score += 15;

      return { student: s, score };
    });

    const filtered = scored.filter(item => item.score >= 40).sort((a, b) => b.score - a.score);
    setFuzzyMatchesPreview(filtered.slice(0, 3));
  }, [manualInputName, classRoster]);

  // Load saved identity from localStorage for Tugasan Umum
  useEffect(() => {
    if (!isGCMode) {
      const isTeacher = isTeacherEmail(user?.email || '');
      if (user && user.displayName && !isTeacher) {
        setPublicNama(user.displayName.toUpperCase());
      } else {
        const savedNama = localStorage.getItem(`umum_student_nama`);
        if (savedNama) setPublicNama(savedNama.toUpperCase());
      }
      if (currentKelasParam) {
        setPublicKelas(currentKelasParam);
      }
    }
  }, [user, isGCMode, currentKelasParam]);

  // Multi-tier question HTML fetching (Client Firestore -> Server API -> Google Sheets GViz)
  useEffect(() => {
    const fetchQuestion = async () => {
      let activeQid = (qid || '').trim();

      // If qid is missing but kod is present, try to find qid from /api/tugasan-umum or local storage
      if (!activeQid && currentKod) {
        try {
          const stored = localStorage.getItem('sistem_tugasan_umum_list');
          if (stored) {
            const list: any[] = JSON.parse(stored);
            const found = list.find((item: any) => (item.kod || '').toUpperCase() === currentKod.toUpperCase());
            if (found && found.qid) {
              activeQid = found.qid;
            }
          }
        } catch (e) {}

        if (!activeQid) {
          try {
            const res = await fetch(`/api/tugasan-umum?kod=${encodeURIComponent(currentKod)}`);
            if (res.ok) {
              const list = await res.json();
              if (Array.isArray(list) && list.length > 0) {
                const matched = list.find((item: any) => (item.kod || '').toUpperCase() === currentKod.toUpperCase()) || list[0];
                if (matched && matched.qid) {
                  activeQid = matched.qid;
                }
              }
            }
          } catch (e) {
            console.warn("Notice fetching qid from kod:", e);
          }
        }
      }

      if (!activeQid) {
        setHtml("Soalan tidak dijumpai.");
        setLoading(false);
        return;
      }

      // Built-in Demo Simulations
      if (activeQid === "sim_ketumpatan" || activeQid === "sim_bandul") {
        if (activeQid === "sim_ketumpatan") {
          const simHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-blue-400 mb-4">Simulasi Ketumpatan</h2><div class="flex flex-col md:flex-row gap-6"><div class="w-full md:w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700"><label class="block text-sm font-bold mb-2">Pilih Cecair:</label><select id="liquid" class="w-full bg-slate-900 p-2 rounded border border-slate-600 mb-4"><option value="1.0">Air (1.0)</option><option value="0.9">Minyak (0.9)</option><option value="1.4">Madu (1.4)</option></select><label class="block text-sm font-bold mb-2">Jatuhkan Bahan:</label><div class="flex gap-2"><button onclick="drop('Gabus', 0.24)" class="flex-1 bg-orange-700 p-2 rounded font-bold">Gabus</button><button onclick="drop('Besi', 7.87)" class="flex-1 bg-slate-500 p-2 rounded font-bold">Besi</button></div><button onclick="resetSim()" class="w-full mt-4 bg-red-600 p-2 rounded font-bold">Reset</button></div><div class="w-full md:w-2/3 h-64 bg-slate-950 rounded-xl relative border border-slate-800 flex justify-center items-end p-8"><div id="beaker" class="w-48 h-56 border-4 border-t-0 border-blue-900 rounded-b-2xl relative overflow-hidden flex flex-col justify-end"><div id="water" class="w-full h-1/2 bg-blue-500/30 border-t-2 border-blue-400"></div><div id="objects" class="absolute inset-0"></div></div></div></div><table class="w-full mt-6 text-sm border border-slate-700"><thead class="bg-slate-800"><tr><th class="p-2 border">Bahan</th><th class="p-2 border">Keputusan</th></tr></thead><tbody id="results"></tbody></table><script>function drop(n,d){const l=parseFloat(document.getElementById('liquid').value);const r=d>l?'Tenggelam':'Terapung';const o=document.createElement('div');o.className='absolute text-xs text-center';o.style.left=(Math.random()*60+20)+'%';o.style.top=r==='Terapung'?'40%':'80%';o.innerHTML='<div class="bg-black/50 px-1 rounded">'+n+'</div><div class="w-8 h-8 rounded '+(n==='Gabus'?'bg-orange-700':'bg-slate-500')+'"></div>';document.getElementById('objects').appendChild(o);const tr=document.createElement('tr');tr.innerHTML='<td class="p-2 border">'+n+'</td><td class="p-2 border">'+r+'</td>';document.getElementById('results').appendChild(tr)}function resetSim(){document.getElementById('objects').innerHTML='';document.getElementById('results').innerHTML=''}</script></body></html>`;
          setHtml(simHtml);
          setLoading(false);
          return;
        } else if (activeQid === "sim_bandul") {
          const simHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-fuchsia-400 mb-4">Bandul Ringkas</h2><div class="flex flex-col md:flex-row gap-6"><div class="w-full md:w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700"><label class="block text-sm mb-1">Panjang: <span id="lenVal">50</span>cm</label><input type="range" id="len" min="20" max="100" value="50" oninput="document.getElementById('lenVal').innerText=this.value" class="w-full mb-4"><button id="btn" onclick="toggle()" class="w-full bg-fuchsia-600 p-3 rounded-xl font-bold">MULA</button><div class="grid grid-cols-2 gap-4 mt-4 text-center"><div class="bg-slate-950 p-2 rounded border border-slate-700"><div class="text-[10px]">MASA (s)</div><div id="time" class="text-xl font-mono text-fuchsia-400">0.00</div></div><div class="bg-slate-950 p-2 rounded border border-slate-700"><div class="text-[10px]">AYUNAN</div><div id="count" class="text-xl font-mono text-emerald-400">0/10</div></div></div></div><div class="w-full md:w-2/3 h-64 bg-slate-950 rounded-xl relative overflow-hidden flex justify-center"><div id="pend" class="absolute top-0 origin-top" style="height:150px"><div class="w-0.5 h-full bg-slate-300 mx-auto"></div><div class="w-6 h-6 bg-pink-500 rounded-full -mt-3 mx-auto"></div></div></div></div><script>let r=false,s,req;function toggle(){const b=document.getElementById('btn');if(r){cancelAnimationFrame(req);r=false;b.innerText='MULA';return}r=true;b.innerText='BERHENTI';s=performance.now();const l=document.getElementById('len').value;const p=2*Math.PI*Math.sqrt(l/100/9.81);function animate(t){const e=(t-s)/1000;const a=-0.5*Math.cos((2*Math.PI/p)*e);document.getElementById('pend').style.transform='rotate('+a+'rad)';document.getElementById('time').innerText=e.toFixed(2);const o=Math.floor(e/p);document.getElementById('count').innerText=Math.min(10,o)+'/10';if(o>=10){r=false;b.innerText='MULA';return}req=requestAnimationFrame(animate)}req=requestAnimationFrame(animate)}</script></body></html>`;
          setHtml(simHtml);
          setLoading(false);
          return;
        }
      }

      // 1. Instant Cache Load (< 10ms)
      let foundHtml = false;
      try {
        const cached = localStorage.getItem(`cached_question_${activeQid}`) || localStorage.getItem(`cached_question_${activeQid.toUpperCase()}`);
        if (cached && cached.trim().length > 100) {
          setHtml(cached);
          setLoading(false);
          foundHtml = true;
        }
      } catch (e) {}

      // 2. Client-side Firestore SDK lookup with 2.5s timeout protection
      try {
        const fetchFs = async () => {
          const docRef = doc(db, "questions", String(activeQid));
          let docSnap = await getDoc(docRef);
          if (!docSnap.exists() && activeQid !== activeQid.toUpperCase()) {
            docSnap = await getDoc(doc(db, "questions", activeQid.toUpperCase()));
          }
          return docSnap;
        };
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
        const docSnap: any = await Promise.race([fetchFs(), timeoutPromise]);
        if (docSnap && docSnap.exists()) {
          const docData = docSnap.data();
          if (docData?.html && docData.html.trim().length > 50) {
            setHtml(docData.html);
            try {
              localStorage.setItem(`cached_question_${activeQid}`, docData.html);
            } catch (e) {}
            setLoading(false);
            return;
          }
        }
      } catch (clientFsErr) {
        console.warn("Client Firestore fetch notice:", clientFsErr);
      }

      // 3. Server API fallback /api/question
      try {
        const url = `/api/question?qid=${encodeURIComponent(activeQid)}${spreadsheetId ? `&spreadsheetId=${spreadsheetId}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.html && data.html.trim().length > 50) {
            setHtml(data.html);
            try {
              localStorage.setItem(`cached_question_${activeQid}`, data.html);
            } catch (e) {}
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("API question fetch notice:", err);
      }

      // 4. Google Sheets GViz JSON direct fallback
      try {
        const targetSheetId = spreadsheetId || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
        const gvizRes = await fetch(`https://docs.google.com/spreadsheets/d/${targetSheetId}/gviz/tq?tqx=out:json`);
        if (gvizRes.ok) {
          const text = await gvizRes.text();
          const jsonString = text.substring(47, text.length - 2);
          const data = JSON.parse(jsonString);
          const rowsData = data.table.rows || [];
          for (const row of rowsData) {
            if (row.c && row.c[7] && row.c[7].v && String(row.c[7].v).trim().toUpperCase() === activeQid.trim().toUpperCase()) {
              let sheetHtml = row.c[6] ? String(row.c[6].v) : '';
              if (row.c.length > 9) {
                for (let i = 9; i < row.c.length; i++) {
                  if (row.c[i] && row.c[i].v) sheetHtml += String(row.c[i].v);
                }
              }
              if (sheetHtml && sheetHtml.trim().length > 50) {
                setHtml(sheetHtml);
                try {
                  localStorage.setItem(`cached_question_${activeQid}`, sheetHtml);
                } catch (e) {}
                setLoading(false);
                return;
              }
            }
          }
        }
      } catch (sheetsErr) {
        console.warn("Sheets GViz fallback notice:", sheetsErr);
      }

      if (!foundHtml) {
        setHtml("Soalan tidak dijumpai.");
      }
      setLoading(false);
    };

    fetchQuestion();
  }, [qid, currentKod, spreadsheetId]);

  const handleSignIn = async () => {
    try {
      setIsDetectingAccount(true);
      const res = await googleSignIn();
      if (res && res.user) {
        const uEmail = (res.user.email || '').toLowerCase().trim();
        const uDisplay = (res.user.displayName || '').trim().toUpperCase();

        if (isTeacherEmail(uEmail)) {
          alert(`Akaun "${uEmail}" dikesan sebagai akaun GURU (g-). Sila gunakan akaun murid DELIMa (m-) untuk menjawab tugasan murid.`);
          return;
        }

        // Match against classroom roster
        let matched = classRoster.find(s => s.email && s.email.toLowerCase() === uEmail);
        if (!matched && uDisplay) {
          matched = classRoster.find(s => normalize(s.fullName) === normalize(uDisplay));
        }

        const studentAcc: MoeAccount = {
          email: uEmail,
          fullName: matched ? matched.fullName : (uDisplay || uEmail.split('@')[0].toUpperCase()),
          userId: matched ? matched.userId : res.user.uid,
          photoUrl: res.user.photoURL || matched?.photoUrl,
          isExactRosterMatch: !!matched
        };

        saveMoeAccount(studentAcc);
        const updated = getStoredMoeAccounts();
        setMoeAccounts(updated);

        // Write directly into confirmation screen!
        setDetectedStudent(studentAcc);
        setIsChoosingAccount(false);
        setIsManualInputMode(false);
      }
    } catch (err: any) {
      console.error(err);
      if (!err?.message?.includes('popup-closed-by-user') && !err?.message?.includes('cancelled')) {
        alert("Gagal mengesan akaun Google. Anda juga boleh menaip nama secara manual.");
      }
    } finally {
      setIsDetectingAccount(false);
    }
  };

  const selectStudentAccount = (account: MoeAccount) => {
    setDetectedStudent(account);
    setIsChoosingAccount(false);
    setIsManualInputMode(false);
  };

  // Google Classroom: Student clicks "Pasti" (Identity confirmed)
  const handleConfirmDetectedStudent = () => {
    if (!detectedStudent) return;

    setConfirmedStudent({
      userId: detectedStudent.userId,
      nama: detectedStudent.fullName,
      email: detectedStudent.email,
      matchedClassroomName: detectedStudent.fullName,
      matchedStudentId: detectedStudent.userId,
      verificationStatus: 'verified'
    });
  };

  // Google Classroom: Student submits manual name input (short name / full name)
  const handleConfirmManualName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = manualInputName.trim().toUpperCase();
    if (!cleanName) {
      alert("Sila masukkan nama anda.");
      return;
    }

    // Check if this short name is already a registered alias for this class
    try {
      const cid = currentCourseId || '';
      const aliasRes = await fetch(`/api/check-alias?courseId=${encodeURIComponent(cid)}&name=${encodeURIComponent(cleanName)}`);
      if (aliasRes.ok) {
        const aliasData = await aliasRes.json();
        if (aliasData.found && aliasData.alias) {
          const al = aliasData.alias;
          setConfirmedStudent({
            userId: al.userId,
            nama: al.fullName,
            rawTypedName: cleanName,
            matchedClassroomName: al.fullName,
            matchedStudentId: al.userId,
            email: al.email || user?.email || '',
            verificationStatus: 'verified',
            possibleMatches: []
          });
          return;
        }
      }
    } catch (e) {
      console.warn("Notice checking alias in StudentView:", e);
    }

    // Best fuzzy match in roster
    const topMatch = fuzzyMatchesPreview[0]?.student;
    const isExact = topMatch && normalize(topMatch.fullName) === normalize(cleanName);

    // If student enters short name (or name with similarity), mark as pending teacher approval
    const verificationStatus = isExact ? 'verified' : 'pending_teacher_approval';

    const candidateMatches = fuzzyMatchesPreview.map(m => ({
      userId: m.student.userId,
      fullName: m.student.fullName,
      email: m.student.email
    }));

    setConfirmedStudent({
      userId: topMatch?.userId,
      nama: cleanName,
      rawTypedName: cleanName,
      matchedClassroomName: topMatch?.fullName || cleanName,
      matchedStudentId: topMatch?.userId || '',
      email: topMatch?.email || user?.email || '',
      verificationStatus,
      possibleMatches: candidateMatches
    });
  };

  // Tugasan Umum: Start quiz form
  const handleStartPublicQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = publicNama.trim().toUpperCase();
    const cleanKelas = (publicKelas || currentKelasParam || 'TUGASAN UMUM').trim().toUpperCase();

    if (!cleanNama) {
      alert("Sila masukkan nama penuh anda.");
      return;
    }

    try {
      localStorage.setItem(`umum_student_nama`, cleanNama);
      localStorage.setItem(`umum_student_kelas`, cleanKelas);
    } catch (e) {}

    setPublicKelas(cleanKelas);
    setIsPublicStarted(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-700">Memuatkan Soalan Interaktif...</p>
      </div>
    );
  }

  // ==========================================
  // RENDER 1: GOOGLE CLASSROOM FLOW
  // ==========================================
  if (isGCMode) {
    // 1A. Step 1: Identification & Confirmation Card
    if (!confirmedStudent) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50/50 to-indigo-100/50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Icon & Title */}
            <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner text-2xl font-bold">
              🎓
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-center text-slate-800 mb-1">
              Pengesahan Murid
            </h2>
            <p className="text-xs text-center text-slate-500 mb-5 leading-relaxed font-medium">
              Google Classroom • Tugasan Interaktif
            </p>

            {/* Teacher Mode testing banner */}
            {user && isTeacherEmail(user.email || '') && (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-left text-xs text-indigo-950 space-y-2 mb-3">
                <div className="flex items-center gap-2 font-black text-indigo-900">
                  <span className="text-base">👨‍🏫</span> Mod Ujian Guru Dikesan
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Anda sedang menggunakan akaun guru ({user.email}). Pilih mana-mana pelajar kelas untuk menguji kuiz:
                </p>
                {classRoster.length > 0 && (
                  <select
                    onChange={(e) => {
                      const s = classRoster.find(st => st.userId === e.target.value);
                      if (s) {
                        selectStudentAccount({
                          userId: s.userId,
                          fullName: s.fullName,
                          email: s.email,
                          photoUrl: s.photoUrl,
                          isExactRosterMatch: true
                        });
                      }
                    }}
                    className="w-full text-xs font-bold p-2.5 border-2 border-indigo-300 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  >
                    <option value="">-- Pilih Murid Kelas Untuk Mod Ujian --</option>
                    {classRoster.map(s => (
                      <option key={s.userId} value={s.userId}>
                        {s.fullName} ({s.email || 'Tiada e-mel'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* A. GOOGLE ACCOUNTS DETECTED IN CHROME */}
            {moeAccounts.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👤</span> Pilih Akaun Google Dikesan ({moeAccounts.length}):
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Sedia Dipilih
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {moeAccounts.map((acc, idx) => (
                    <button
                      key={acc.email || idx}
                      type="button"
                      onClick={() => selectStudentAccount(acc)}
                      className="w-full text-left p-3.5 bg-white hover:bg-emerald-50/80 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl transition shadow-xs group flex items-center justify-between cursor-pointer active:scale-98"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {acc.photoUrl ? (
                            <img src={acc.photoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            acc.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800 truncate uppercase">
                            {acc.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                            {acc.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 shrink-0 ml-2 group-hover:bg-emerald-600 group-hover:text-white transition">
                        Pilih ➔
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isDetectingAccount}
                  className="w-full py-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50/60 hover:bg-blue-100/60 rounded-xl border border-blue-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-3.5 h-3.5" />
                  <span>{isDetectingAccount ? "Menyemak Akaun..." : "+ Kesan / Log Masuk Akaun Google Lain"}</span>
                </button>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <p className="text-xs text-slate-600 leading-relaxed font-medium mb-2.5">
                  Tiada akaun Google murid dikesan secara automatik di Chrome ini.
                </p>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isDetectingAccount}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-3.5 h-3.5" />
                  <span>{isDetectingAccount ? "Menyemak Akaun..." : "Kesan Akaun Google (Chrome)"}</span>
                </button>
              </div>
            )}

            {/* B. DIVIDER */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 absolute">
                ATAU MASUKKAN NAMA MANUAL
              </span>
            </div>

            {/* C. MANUAL INPUT FIELD */}
            <form onSubmit={handleConfirmManualName} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  NAMA PELAJAR <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualInputName}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.toUpperCase();
                  }}
                  onChange={(e) => setManualInputName(e.target.value.toUpperCase())}
                  style={{
                    backgroundColor: '#ffffff',
                    textTransform: 'uppercase'
                  }}
                  className="w-full px-4 py-3 text-sm font-extrabold border-2 border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none uppercase placeholder:!text-slate-400 placeholder:!opacity-40 placeholder:!font-normal shadow-xs transition"
                  placeholder="CONTOH: AHMAD BIN ABDULLAH"
                />
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Jika nama pendek dimasukkan, markah terus direkodkan dan disahkan oleh guru.
                </p>
              </div>

              {fuzzyMatchesPreview.length > 0 && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-2.5 space-y-1">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" /> Cadangan Padanan Kelas:
                  </div>
                  {fuzzyMatchesPreview.map((match, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setManualInputName(match.student.fullName)}
                      className="w-full text-left bg-white hover:bg-blue-100/70 border border-blue-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="truncate">{match.student.fullName}</span>
                      <span className="text-[10px] text-blue-600 font-mono shrink-0 ml-1">Pilih ➔</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={!manualInputName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black py-3 px-4 rounded-xl transition shadow-md shadow-blue-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Sahkan & Mula Menjawab Kuiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      );
    }

    // 1D. Step 2: Google Classroom Quiz in progress
    const activeStudentName = confirmedStudent.nama;
    const activeStudentEmail = confirmedStudent.email || user?.email || '';
    const isPendingApproval = confirmedStudent.verificationStatus === 'pending_teacher_approval';

    const gcScriptToInject = `
      <script>
        window.USER_NAME = "${activeStudentName.replace(/"/g, '\\"')}";
        window.USER_EMAIL = "${activeStudentEmail.replace(/"/g, '\\"')}";
        window.USER_KELAS = "${(courseName || currentKelasParam || '').replace(/"/g, '\\"')}";
        window.COURSE_ID = "${(currentCourseId || '').replace(/"/g, '\\"')}";
        window.COURSE_WORK_ID = "${(currentCourseWorkId || '').replace(/"/g, '\\"')}";
        window.IS_UMUM = false;
        window.VERIFICATION_STATUS = "${confirmedStudent.verificationStatus}";

        window.hantarMarkahKeSistem = function(markah, status) {
          try {
            fetch('/api/submit-score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                qid: "${qid}",
                kod: "${currentKod || ''}",
                kelas: "${(courseName || currentKelasParam || '').replace(/"/g, '\\"')}",
                courseId: "${(currentCourseId || '').replace(/"/g, '\\"')}",
                courseWorkId: "${(currentCourseWorkId || '').replace(/"/g, '\\"')}",
                nama: "${activeStudentName.replace(/"/g, '\\"')}",
                rawTypedName: "${(confirmedStudent.rawTypedName || activeStudentName).replace(/"/g, '\\"')}",
                matchedClassroomName: "${(confirmedStudent.matchedClassroomName || activeStudentName).replace(/"/g, '\\"')}",
                matchedStudentId: "${confirmedStudent.matchedStudentId || ''}",
                email: "${activeStudentEmail.replace(/"/g, '\\"')}",
                markah: markah !== undefined && markah !== null ? Number(markah) : null,
                status: status || 'Selesai Menjawab',
                verificationStatus: "${confirmedStudent.verificationStatus}",
                possibleMatches: ${JSON.stringify(confirmedStudent.possibleMatches || [])},
                mod: 'gc',
                spreadsheetId: "${spreadsheetId || ''}"
              })
            }).then(function(res) { return res.json(); }).then(function(data) {
              console.log("Markah Google Classroom direkod:", data);
            }).catch(function(err) {
              console.error("Ralat simpan markah GC:", err);
            });
          } catch(e) {
            console.error("Ralat penyerahan GC:", e);
          }
        };
      </script>
    `;

    let injectedGCHtml = html || '';
    if (/<\/head>/i.test(injectedGCHtml)) {
      injectedGCHtml = injectedGCHtml.replace(/<\/head>/i, `${gcScriptToInject}</head>`);
    } else if (/<body[^>]*>/i.test(injectedGCHtml)) {
      injectedGCHtml = injectedGCHtml.replace(/<body[^>]*>/i, (match) => `${match}${gcScriptToInject}`);
    } else {
      injectedGCHtml = `<!DOCTYPE html><html><head>${gcScriptToInject}</head><body>${injectedGCHtml}</body></html>`;
    }

    return (
      <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              🎓
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
                Tugasan Google Classroom
              </div>
              <div className="text-[10px] text-blue-600 font-bold leading-none mt-0.5">
                {courseName || currentKelasParam || 'Kelas Aktif'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <div className="text-xs font-black text-slate-800 uppercase leading-tight truncate max-w-[150px] sm:max-w-none">
                {activeStudentName}
              </div>
              {isPendingApproval ? (
                <div className="text-[10px] text-amber-600 font-bold flex items-center justify-end gap-1">
                  <span>⚠️ Perlu Pengesahan Guru</span>
                </div>
              ) : (
                <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                  <span>✓ Disahkan</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setConfirmedStudent(null)}
              className="text-[10px] sm:text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 sm:px-2.5 py-1 rounded-lg font-bold border border-slate-200 transition cursor-pointer"
              title="Tukar Maklumat Murid"
            >
              Tukar
            </button>
          </div>
        </div>

        {/* If pending approval notice banner */}
        {isPendingApproval && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>
              ℹ️ Anda menjawab menggunakan nama ditaip: <strong>{activeStudentName}</strong>. Rekod ini akan disahkan oleh guru anda.
            </span>
          </div>
        )}

        <iframe 
          srcDoc={injectedGCHtml}
          style={{ width: '100%', height: 'calc(100vh - 56px)', minHeight: 'calc(100vh - 56px)', border: 'none', display: 'block' }}
          className="w-full flex-1 bg-white"
          title="Tugasan Google Classroom"
        />
      </div>
    );
  }

  // ==========================================
  // RENDER 2: PUBLIC MODE (TUGASAN UMUM)
  // ==========================================
  if (!isPublicStarted) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-100/50 p-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner text-2xl font-bold">
            🎓
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-center text-slate-800 mb-1">
            Pengesahan Murid
          </h2>
          <p className="text-xs text-center text-slate-500 mb-5 leading-relaxed font-medium">
            Sila masukkan nama penuh anda untuk memulakan kuiz.
          </p>

          {currentKod && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Kod Tugasan:
              </span>
              <span className="font-mono text-xs font-black bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 text-emerald-900 shadow-xs">
                {currentKod}
              </span>
            </div>
          )}

          <form onSubmit={handleStartPublicQuiz} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                NAMA PENUH PELAJAR <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={publicNama}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.toUpperCase();
                }}
                onChange={(e) => setPublicNama(e.target.value.toUpperCase())}
                style={{ 
                  backgroundColor: '#ffffff', 
                  textTransform: 'uppercase'
                }}
                className="w-full px-4 py-3 text-sm font-extrabold border-2 border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none uppercase placeholder:!text-slate-400 placeholder:!opacity-40 placeholder:!font-normal shadow-xs transition"
                placeholder="CONTOH: AHMAD BIN ABDULLAH"
                autoFocus
              />
            </div>

            <button 
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 px-4 rounded-xl transition shadow-lg shadow-emerald-600/25 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Mula Menjawab Tugasan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <span>🔒</span> Markah direkodkan secara automatik ke Google Spreadsheet guru
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Public Mode Started: Inject script and render iframe
  const publicScriptToInject = `
    <style>
      #delima-login-popup { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
    </style>
    <script>
      window.USER_NAME = "${publicNama.replace(/"/g, '\\"')}";
      window.USER_EMAIL = "";
      window.USER_KELAS = "${publicKelas.replace(/"/g, '\\"')}";
      window.TUGASAN_KOD = "${(currentKod || '').replace(/"/g, '\\"')}";
      window.IS_UMUM = true;

      function hapusPopupLogin() {
        try {
          var el = document.getElementById('delima-login-popup');
          if (el) el.remove();
          var allPopups = document.querySelectorAll('#delima-login-popup');
          allPopups.forEach(function(p) { p.remove(); });
        } catch(e) {}
      }
      window.addEventListener('DOMContentLoaded', hapusPopupLogin);
      setTimeout(hapusPopupLogin, 100);
      setTimeout(hapusPopupLogin, 500);

      window.hantarMarkahKeSistem = function(markah, status) {
        try {
          fetch('/api/submit-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qid: "${qid}",
              kod: "${currentKod || ''}",
              kelas: "${publicKelas.replace(/"/g, '\\"')}",
              nama: "${publicNama.replace(/"/g, '\\"')}",
              markah: markah !== undefined && markah !== null ? Number(markah) : null,
              status: status || 'Selesai',
              isUmum: true,
              spreadsheetId: "${spreadsheetId || ''}"
            })
          }).then(function(res) { return res.json(); }).then(function(data) {
            console.log("Markah tugasan berjaya direkod:", data);
          }).catch(function(err) {
            console.error("Ralat simpan markah:", err);
          });
        } catch(e) {
          console.error("Ralat penyerahan:", e);
        }
      };
    </script>
  `;

  let injectedPublicHtml = html || '';
  if (/<\/head>/i.test(injectedPublicHtml)) {
    injectedPublicHtml = injectedPublicHtml.replace(/<\/head>/i, `${publicScriptToInject}</head>`);
  } else if (/<body[^>]*>/i.test(injectedPublicHtml)) {
    injectedPublicHtml = injectedPublicHtml.replace(/<body[^>]*>/i, (match) => `${match}${publicScriptToInject}`);
  } else {
    injectedPublicHtml = `<!DOCTYPE html><html><head>${publicScriptToInject}</head><body>${injectedPublicHtml}</body></html>`;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            📝
          </div>
          <div>
            <div className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
              Tugasan Interaktif
            </div>
            {currentKod && (
              <div className="text-[10px] text-emerald-600 font-mono font-bold leading-none">
                Kod: {currentKod}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <div className="text-xs font-black text-slate-800 uppercase leading-tight truncate max-w-[140px] sm:max-w-none">
              {publicNama}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 leading-none">
              Kelas: {publicKelas}
            </div>
          </div>
          <button 
            onClick={() => setIsPublicStarted(false)}
            className="text-[10px] sm:text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 sm:px-2.5 py-1 rounded-lg font-bold border border-slate-200 transition cursor-pointer"
            title="Tukar Maklumat Pelajar"
          >
            Tukar
          </button>
        </div>
      </div>

      <iframe 
        srcDoc={injectedPublicHtml}
        style={{ width: '100%', height: 'calc(100vh - 56px)', minHeight: 'calc(100vh - 56px)', border: 'none', display: 'block' }}
        className="w-full flex-1 bg-white"
        title="Tugasan Soalan Interaktif"
      />
    </div>
  );
}
