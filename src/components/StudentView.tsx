import { useState, useEffect } from 'react';
import { getQuestionsFromSheets } from '../lib/sheets';
import { googleSignIn, initAuth, logout } from '../lib/firebase';
import { LogOut } from 'lucide-react';

export default function StudentView({ 
  qid, 
  spreadsheetId, 
  gasWebAppUrl 
}: { 
  qid: string;
  spreadsheetId?: string | null;
  gasWebAppUrl?: string | null;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // DELIMa verification states for non-DELIMa google sessions
  const [delimaEmail, setDelimaEmail] = useState('');
  const [delimaName, setDelimaName] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth((u) => {
      setUser(u);
    }, () => {
      setUser(null);
      setVerifiedEmail(null);
      setVerifiedName(null);
    });
    return () => unsubscribe();
  }, []);

  // Load from localStorage if present
  useEffect(() => {
    if (user) {
      const savedEmail = localStorage.getItem(`delima_email_${user.uid}`);
      const savedName = localStorage.getItem(`delima_name_${user.uid}`);
      if (savedEmail) {
        setVerifiedEmail(savedEmail);
        setDelimaEmail(savedEmail);
      }
      if (savedName) {
        setVerifiedName(savedName);
        setDelimaName(savedName);
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        // Fetch question HTML from API, passing the spreadsheetId if available so the correct sheet is queried
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
    fetchQuestion();
  }, [qid]);

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
    const nameTrimmed = delimaName.trim();

    if (!emailLower) {
      alert("Sila masukkan e-mel anda.");
      return;
    }
    if (emailLower.indexOf('@') === -1) {
      alert("Ralat: Sila masukkan e-mel yang sah.");
      return;
    }
    if (!nameTrimmed) {
      alert("Sila masukkan nama penuh anda.");
      return;
    }

    if (user) {
      localStorage.setItem(`delima_email_${user.uid}`, emailLower);
      localStorage.setItem(`delima_name_${user.uid}`, nameTrimmed);
    }
    setVerifiedEmail(emailLower);
    setVerifiedName(nameTrimmed);
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">Memuatkan Soalan...</div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-slate-200">
          <div className="text-4xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Log Masuk Pelajar</h2>
          <p className="text-slate-500 text-sm mb-8">Sila log masuk menggunakan akaun Google / DELIMa anda untuk menjawab soalan ini.</p>
          <button 
            onClick={handleSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-sm"
          >
            Log Masuk Google
          </button>
        </div>
      </div>
    );
  }

  const isUserDelima = user.email && user.email.toLowerCase().endsWith('@moe-dl.edu.my');
  const finalEmail = isUserDelima ? user.email.toLowerCase() : verifiedEmail;
  const finalName = isUserDelima ? user.displayName : (verifiedName || user.displayName);

  // If NOT logged in with DELIMa google account, and not manually verified yet, show verification card
  if (!isUserDelima && !verifiedEmail) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4 overflow-y-auto">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full border border-slate-200 my-4">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2 text-slate-800">Sahkan Identiti Anda</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Sistem mengesan anda log masuk dengan akaun peribadi (<span className="font-mono text-rose-600 font-bold">{user.email}</span>). 
            Sila sahkan e-mel (DELIMa/Peribadi) dan nama penuh anda di bawah.
          </p>
          
          <div className="space-y-4 text-left mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">E-mel Pelajar</label>
              <input 
                type="email"
                value={delimaEmail}
                onChange={(e) => setDelimaEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Contoh: pelajar@gmail.com"
              />
              <p className="text-[10px] text-slate-400 mt-1">Pastikan e-mel yang dimasukkan adalah sah.</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nama Penuh Pelajar (Seperti dalam Classroom)</label>
              <input 
                type="text"
                value={delimaName}
                onChange={(e) => setDelimaName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Masukkan nama penuh anda"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={handleVerifyDelima}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition text-sm shadow-sm"
            >
              Sahkan & Mula Menjawab
            </button>
            <button 
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-700 hover:underline py-1.5"
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

  // Inject user info so the iframe script can access it!
  const scriptToInject = `
    <script>
      window.USER_EMAIL = "${finalEmail}";
      window.USER_NAME = "${finalName}";
    </script>
  `;

  const injectedHtml = html.replace('</head>', `${scriptToInject}</head>`);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
      <div className="bg-white px-4 py-2 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="font-bold text-slate-700">Kuiz Interaktif</div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight">{finalName}</span>
            <span className="text-[10px] text-slate-400 font-mono leading-none">{finalEmail}</span>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-red-500 transition">
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
