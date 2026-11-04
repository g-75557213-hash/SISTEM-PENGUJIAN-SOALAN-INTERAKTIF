import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth, logout } from '../lib/firebase';
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
  
  // Public Mode (Tugasan Umum) state - Strictly NO Google/Chrome Login required!
  const [isPublicMode, setIsPublicMode] = useState<boolean>(() => {
    return initialMod === 'umum' || urlParams?.get('mod') === 'umum' || !!currentKod;
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

  // Fetch question HTML
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const url = `/api/question?qid=${qid}${spreadsheetId ? `&spreadsheetId=${spreadsheetId}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setHtml(data.html);
        } else {
          setHtml("Soalan tidak dijumpai.");
        }
      } catch (err) {
        console.error(err);
        setHtml("Gagal memuat turun soalan.");
      } finally {
        setLoading(false);
      }
    };
    if (qid) {
      fetchQuestion();
    }
  }, [qid, spreadsheetId]);

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
    const cleanKelas = publicKelas.trim().toUpperCase();

    if (!cleanNama) {
      alert("Sila masukkan NAMA PENUH anda dalam HURUF BESAR.");
      return;
    }
    if (!cleanKelas) {
      alert("Sila masukkan KELAS anda.");
      return;
    }

    try {
      localStorage.setItem(`umum_student_nama`, cleanNama);
      localStorage.setItem(`umum_student_kelas`, cleanKelas);
    } catch (e) {}

    setIsPublicStarted(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner text-3xl font-bold">
              🎓
            </div>
            
            <div className="flex justify-center mb-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-black px-3.5 py-1 rounded-full border border-emerald-300 shadow-xs uppercase tracking-wide">
                <span>✨</span> MOD UMUM • TIADA LOG MASUK DIPERLUKAN
              </span>
            </div>

            <h2 className="text-2xl font-black text-center text-slate-800 mb-1">
              Pengesahan Murid
            </h2>
            <p className="text-xs text-center text-slate-600 mb-5 leading-relaxed font-medium">
              Sila masukkan <span className="font-bold text-emerald-800">NAMA PENUH (HURUF BESAR)</span> dan <span className="font-bold text-slate-800">KELAS</span> anda sebelum mula menjawab soalan kuiz.
            </p>

            {currentKod && (
              <div className="mb-4.5 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    NAMA PENUH (HURUF BESAR) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 uppercase">
                    HURUF BESAR
                  </span>
                </div>
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
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium leading-tight">
                  <span>ℹ️</span> Taip nama penuh rasmi dalam <strong>HURUF BESAR</strong> seperti dalam pendaftaran sekolah.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  KELAS <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={publicKelas}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.toUpperCase();
                  }}
                  onChange={(e) => setPublicKelas(e.target.value.toUpperCase())}
                  style={{ 
                    color: '#000000', 
                    WebkitTextFillColor: '#000000', 
                    backgroundColor: '#ffffff', 
                    caretColor: '#000000',
                    textTransform: 'uppercase'
                  }}
                  className="w-full px-4 py-3 text-sm font-bold border-2 border-slate-300 rounded-xl bg-white !bg-white text-black !text-black focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none uppercase placeholder:text-slate-400 placeholder:font-normal shadow-xs transition"
                  placeholder="CONTOH: 1 ABU BAKAR / 5 CEMERLANG"
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 px-4 rounded-xl transition shadow-lg shadow-emerald-600/25 text-base flex items-center justify-center gap-2 cursor-pointer active:scale-98"
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
    if (!html || html.startsWith("S") || html.startsWith("G")) {
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
                isUmum: true
              })
            }).then(function(res) { return res.json(); }).then(function(data) {
              console.log("Markah tugasan umum berjaya direkod:", data);
            }).catch(function(err) {
              console.error("Ralat simpan markah:", err);
            });
          } catch(e) {
            console.error("Ralat penyerahan:", e);
          }
        };
      </script>
    `;

    const injectedPublicHtml = html.includes('</head>') 
      ? html.replace('</head>', `${publicScriptToInject}</head>`)
      : `${publicScriptToInject}${html}`;

    return (
      <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
        {/* TOP BAR FOR PUBLIC MODE */}
        <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
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
              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold border border-slate-200 transition"
              title="Tukar Maklumat Pelajar"
            >
              Tukar
            </button>
          </div>
        </div>

        <iframe 
          srcDoc={injectedPublicHtml}
          className="w-full h-full border-0 flex-1"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
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

  if (!html || html.startsWith("S") || html.startsWith("G")) {
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

  const injectedHtml = html.includes('</head>')
    ? html.replace('</head>', `${scriptToInject}</head>`)
    : `${scriptToInject}${html}`;

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
        className="w-full h-full border-0 flex-1"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
