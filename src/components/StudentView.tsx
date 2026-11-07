import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth, logout, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, UserCheck, BookOpen, Hash, School } from 'lucide-react';

interface StudentViewProps {
  qid: string;
  kod?: string | null;
  kelasParam?: string | null;
  modParam?: string | null;
  spreadsheetId?: string | null;
  gasWebAppUrl?: string | null;
}

export default function StudentView({ 
  qid, 
  kod: initialKod,
  kelasParam: initialKelas,
  modParam: initialMod,
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
  // Public Mode state - Strictly NO Google/Chrome Login required!
  const [isPublicMode, setIsPublicMode] = useState<boolean>(() => {
    if (initialMod === 'delima' || urlParams?.get('mod') === 'delima') {
      return false;
    }
    return true;
  });

  const [publicNama, setPublicNama] = useState('');
  const [publicKelas, setPublicKelas] = useState(currentKelasParam || '');
  const [isPublicStarted, setIsPublicStarted] = useState(false);

  // DELIMa verification states for Google Classroom mode
  const [delimaEmail, setDelimaEmail] = useState('');
  const [delimaName, setDelimaName] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  // Only init Firebase auth listener if NOT in public mode
  useEffect(() => {
    if (isPublicMode) return;

    const unsubscribe = initAuth((u) => {
      setUser(u);
    }, () => {
      setUser(null);
      setVerifiedEmail(null);
      setVerifiedName(null);
    });

    return () => unsubscribe();
  }, [isPublicMode]);

  // Load saved identity from localStorage
  useEffect(() => {
    if (isPublicMode) {
      // Pre-fill nama jika akaun terlog masuk dikesan, tetapi kekalkan borang pengesahan murid
      if (user && user.displayName) {
        setPublicNama(user.displayName.toUpperCase());
      } else {
        const savedNama = localStorage.getItem(`umum_student_nama`);
        if (savedNama) setPublicNama(savedNama.toUpperCase());
      }
      if (currentKelasParam) {
        setPublicKelas(currentKelasParam);
      }
    } else if (user) {
      const savedEmail = localStorage.getItem(`delima_email_${user.uid}`);
      const savedName = localStorage.getItem(`delima_name_${user.uid}`);
      if (savedEmail) {
        setVerifiedEmail(savedEmail);
        setDelimaEmail(savedEmail);
      } else {
        setDelimaEmail(user.email || '');
      }
      if (savedName) {
        setVerifiedName(savedName);
        setDelimaName(savedName);
      } else {
        setDelimaName(user.displayName || '');
      }
    }
  }, [user, isPublicMode, currentKelasParam]);

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

      // 0. Built-in Demo Simulations
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
      await googleSignIn();
    } catch (err) {
      console.error(err);
      alert("Gagal log masuk.");
    }
  };

  const handleVerifyDelima = () => {
    const emailLower = delimaEmail.toLowerCase().trim();
    const nameUpper = delimaName.toUpperCase().trim();

    if (emailLower && emailLower.indexOf('@') === -1) {
      alert("Ralat: Sila masukkan e-mel yang sah.");
      return;
    }
    if (!nameUpper) {
      alert("Sila masukkan nama penuh anda.");
      return;
    }

    if (user) {
      localStorage.setItem(`delima_email_${user.uid}`, emailLower);
      localStorage.setItem(`delima_name_${user.uid}`, nameUpper);
    }
    setVerifiedEmail(emailLower);
    setVerifiedName(nameUpper);
  };

  const handleStartPublicQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = publicNama.trim().toUpperCase();
    const cleanKelas = (publicKelas || currentKelasParam || 'TUGASAN UMUM').trim().toUpperCase();

    if (!cleanNama) {
      alert("Sila masukkan NAMA PENUH anda dalam HURUF BESAR.");
      return;
    }

    try {
      localStorage.setItem(`umum_student_nama`, cleanNama);
      localStorage.setItem(`umum_student_kelas`, cleanKelas);
    } catch (e) {}

    setPublicKelas(cleanKelas);
    setIsPublicStarted(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-700">Memuatkan Soalan Interaktif...</p>
      </div>
    );
  }

  // ==========================================
  // 1. PUBLIC MODE (TUGASAN UMUM - NO GOOGLE LOGIN)
  // ==========================================
  if (isPublicMode) {
    if (!isPublicStarted) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-100/50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full border-2 border-emerald-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner text-3xl font-bold">
              🎓
            </div>

            <h2 className="text-2xl font-black text-center text-slate-800 mb-1">
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
                    color: '#000000', 
                    WebkitTextFillColor: '#000000', 
                    backgroundColor: '#ffffff', 
                    caretColor: '#000000',
                    textTransform: 'uppercase'
                  }}
                  className="w-full px-4 py-3.5 text-base font-extrabold border-2 border-slate-300 rounded-xl bg-white !bg-white text-black !text-black focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none uppercase placeholder:text-slate-400 placeholder:font-normal shadow-xs transition"
                  placeholder="CONTOH: AHMAD BIN ABDULLAH"
                  autoFocus
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 px-4 rounded-xl transition shadow-lg shadow-emerald-600/25 text-base flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Mula Menjawab Tugasan</span>
                <span className="text-lg">➔</span>
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
    if (!html || html === "Soalan tidak dijumpai." || html.startsWith("Gagal") || html.trim().length < 30) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="text-center max-w-md">
            <p className="text-lg text-slate-700 font-bold mb-4">{html || "Soalan tidak dijumpai."}</p>
            <button 
              onClick={() => setIsPublicStarted(false)} 
              className="text-blue-600 font-bold underline text-sm"
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        </div>
      );
    }

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

        // Bersihkan sebarang popup pengesahan DELIMa atau Google login jika ada dalam fail soalan
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
        setTimeout(hapusPopupLogin, 1500);

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

    let injectedPublicHtml = html;
    if (/<\/head>/i.test(injectedPublicHtml)) {
      injectedPublicHtml = injectedPublicHtml.replace(/<\/head>/i, `${publicScriptToInject}</head>`);
    } else if (/<body[^>]*>/i.test(injectedPublicHtml)) {
      injectedPublicHtml = injectedPublicHtml.replace(/<body[^>]*>/i, (match) => `${match}${publicScriptToInject}`);
    } else {
      injectedPublicHtml = `<!DOCTYPE html><html><head>${publicScriptToInject}</head><body>${injectedPublicHtml}</body></html>`;
    }

    return (
      <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
        {/* TOP BAR FOR PUBLIC MODE */}
        <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
              📝
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
                Tugasan Interaktif
              </div>
              {currentKod && (
                <div className="text-[10px] text-blue-600 font-mono font-bold leading-none">
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
              <div className="text-[11px] font-bold text-blue-600 leading-none">
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

  if (!user) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-7 sm:p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎓
          </div>
          <h2 className="text-2xl font-black mb-1 text-slate-800">Akses Kuiz Interaktif</h2>
          <p className="text-slate-500 text-xs mb-6 leading-relaxed">
            Pilih kaedah menjawab di bawah mengikut arahan guru anda:
          </p>

          <div className="space-y-3">
            {/* OPTION 1: TUGASAN UMUM (NO CHROME LOGIN AT ALL) */}
            <button 
              onClick={() => setIsPublicMode(true)}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3.5 px-4 rounded-xl transition shadow-md shadow-emerald-500/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🌐</span>
              <span>Jawab Sebagai Tugasan Umum</span>
            </button>
            <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
              ✨ Tidak perlu log masuk Chrome / Google. Hanya masukkan Nama Penuh & Kelas.
            </p>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Atau Guna Classroom</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* OPTION 2: GOOGLE CLASSROOM / DELIMA SIGN IN */}
            <button 
              onClick={handleSignIn}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              <span>Log Masuk Google / DELIMa (Classroom)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isUserDelima = user.email && user.email.toLowerCase().endsWith('@moe-dl.edu.my');
  const finalEmail = isUserDelima ? user.email.toLowerCase() : verifiedEmail;
  const finalName = isUserDelima ? user.displayName : (verifiedName || user.displayName);

  // Guest card for non-DELIMa google sessions
  if (!isUserDelima && !verifiedEmail) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4 overflow-y-auto">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full border border-slate-200 my-4">
          <div className="text-4xl mb-4">👤</div>
          <h2 className="text-xl font-bold mb-2 text-slate-800">Profil Tetamu (Guest)</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Anda menggunakan akaun peribadi (<span className="font-mono text-slate-600 font-bold">{user.email}</span>). 
            Sila lengkapkan profil di bawah untuk membolehkan guru merekod markah anda.
          </p>
          
          <div className="space-y-4 text-left mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-MEL DELIMA (Atau E-mel Pelajar)
              </label>
              <input 
                type="email"
                value={delimaEmail}
                onChange={(e) => setDelimaEmail(e.target.value)}
                style={{ 
                  color: '#000000', 
                  WebkitTextFillColor: '#000000', 
                  backgroundColor: '#ffffff', 
                  caretColor: '#000000' 
                }}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white !bg-white font-mono text-black !text-black font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="m-1234567@moe-dl.edu.my"
              />
              <p className="text-[10px] text-slate-400 mt-1">Mestilah e-mel @moe-dl.edu.my yang sah (atau e-mel pelajar)</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                NAMA PENUH
              </label>
              <input 
                type="text"
                value={delimaName}
                onChange={(e) => setDelimaName(e.target.value)}
                style={{ 
                  color: '#000000', 
                  WebkitTextFillColor: '#000000', 
                  backgroundColor: '#ffffff', 
                  caretColor: '#000000' 
                }}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white !bg-white text-black !text-black font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                placeholder="Contoh: ABU BIN ALI"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={handleVerifyDelima}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition text-sm shadow-sm cursor-pointer"
            >
              Teruskan & Mula Menjawab
            </button>
            <button 
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-700 hover:underline py-1.5 cursor-pointer"
            >
              Log Keluar & Tukar Akaun Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!html || html === "Soalan tidak dijumpai." || html.startsWith("Gagal") || html.trim().length < 30) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-xl text-slate-700 font-bold mb-4">{html}</p>
          <button onClick={logout} className="text-blue-600 underline">Log Keluar</button>
        </div>
      </div>
    );
  }

  const scriptToInject = `
    <script>
      window.USER_EMAIL = "${(finalEmail || '').replace(/"/g, '\\"')}";
      window.USER_NAME = "${(finalName || '').replace(/"/g, '\\"')}";
      window.IS_UMUM = false;
    </script>
  `;

  let injectedHtml = html || '';
  if (/<\/head>/i.test(injectedHtml)) {
    injectedHtml = injectedHtml.replace(/<\/head>/i, `${scriptToInject}</head>`);
  } else if (/<body[^>]*>/i.test(injectedHtml)) {
    injectedHtml = injectedHtml.replace(/<body[^>]*>/i, (match) => `${match}${scriptToInject}`);
  } else {
    injectedHtml = `<!DOCTYPE html><html><head>${scriptToInject}</head><body>${injectedHtml}</body></html>`;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      <div className="bg-white px-4 py-2 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="font-bold text-slate-700">Kuiz Interaktif (DELIMa)</div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight">{finalName}</span>
            <span className="text-[10px] text-slate-400 font-mono leading-none">{finalEmail}</span>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-red-500 transition cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <iframe 
        srcDoc={injectedHtml}
        style={{ width: '100%', height: 'calc(100vh - 56px)', minHeight: 'calc(100vh - 56px)', border: 'none', display: 'block' }}
        className="w-full flex-1 bg-white"
        title="Kuiz Interaktif DELIMa"
      />
    </div>
  );
}
