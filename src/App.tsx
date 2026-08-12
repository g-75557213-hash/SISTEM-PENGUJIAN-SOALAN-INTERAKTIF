import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Monitor, Smartphone, Maximize, CheckCircle, Copy, AlertCircle, Play, Save, Settings, Code, Trash2, BookOpen, Lock, X, Youtube } from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebase';
import { User } from 'firebase/auth';
import { saveQuestionToSheets, getQuestionsFromSheets, SoalanData, syncSubmissionsToSheets, saveSimulasiToSheets, getSimulasiFromSheets, SimulasiData } from './lib/sheets';
import { SENARAI_SUBJEK, getSenaraiBab, generateSPOptions } from './lib/kssmData';
import { getClasses, createAssignment, GCClass } from './lib/classroom';
import { uploadFileToDrive } from './lib/drive';
import BankSoalan from './components/BankSoalan';
import SemakanGuru from './components/SemakanGuru';
import StudentView from './components/StudentView';
import ColorfulSelect from './components/ColorfulSelect';
import LiveGamificationStudio from './components/LiveGamificationStudio';
import { Gamepad2, Sparkles, Layers } from 'lucide-react';

export default function App() {
  const [systemMode, setSystemMode] = useState<'soalan_interaktif' | 'live_gamification'>('soalan_interaktif');
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [qidParams, setQidParams] = useState<string | null>(null);
  const [spreadsheetIdParam, setSpreadsheetIdParam] = useState<string | null>(null);
  const [gasWebAppUrlParam, setGasWebAppUrlParam] = useState<string | null>(null);

  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    return localStorage.getItem('smkj_spreadsheet_id') || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  });
  const [gasWebAppUrl, setGasWebAppUrl] = useState(() => {
    return localStorage.getItem('smkj_gas_web_app_url') || '';
  });
  const [driveFolderLink, setDriveFolderLink] = useState(() => {
    return localStorage.getItem('smkj_drive_folder_link') || '';
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qid = urlParams.get('qid');
    const sheetId = urlParams.get('spreadsheetId');
    const gasUrl = urlParams.get('gasWebAppUrl');

    setQidParams(qid);
    if (sheetId) {
      setSpreadsheetIdParam(sheetId);
      setSpreadsheetId(sheetId);
    }
    if (gasUrl) {
      setGasWebAppUrlParam(gasUrl);
      setGasWebAppUrl(gasUrl);
    }
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  
  const [htmlCode, setHtmlCode] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'fullscreen'>('desktop');
  const [previewHeight, setPreviewHeight] = useState<number>(650);
  const [autoHeight, setAutoHeight] = useState<boolean>(true);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptKriteria, setPromptKriteria] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [questionVideoLink, setQuestionVideoLink] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    namaGuru: '',
    tingkatan: '',
    subjek: '',
    bab: '',
    sp: ''
  });

  const [activeTab, setActiveTab] = useState<'bina' | 'bank' | 'semakan'>('bina');

  // Bank Soalan State
  const [questions, setQuestions] = useState<SoalanData[]>([]);
  const [simulasiList, setSimulasiList] = useState<SimulasiData[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [classes, setClasses] = useState<GCClass[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<Record<string, any>>({});
  const [tokenExpired, setTokenExpired] = useState(false);

  const loadData = async (accessToken: string, customSheetId?: string) => {
    if (!accessToken) {
      console.warn("loadData called without access token");
      setTokenExpired(true);
      return;
    }

    setIsLoadingQuestions(true);
    setTokenExpired(false);
    
    let successCount = 0;
    const targetSheetId = customSheetId || spreadsheetId;

    // Load questions from Sheets
    try {
      const qs = await getQuestionsFromSheets(accessToken, targetSheetId);
      setQuestions(qs);
      const sims = await getSimulasiFromSheets(accessToken, targetSheetId);
      setSimulasiList(sims);
      successCount++;
    } catch (err: any) {
      if (err && err.message === 'UNAUTHENTICATED') {
        console.warn("Sesi Google Sheets tamat tempoh.");
        logout();
      } else {
        console.error("Gagal mendapatkan soalan dari Google Sheets:", err);
      }
      setTokenExpired(true);
    }

    // Load classes from Classroom
    try {
      const cls = await getClasses(accessToken);
      setClasses(cls);
      successCount++;
    } catch (err: any) {
      if (err && err.message === 'UNAUTHENTICATED') {
        console.warn("Sesi Google Classroom tamat tempoh.");
        logout();
      } else {
        console.error("Gagal mendapatkan kelas dari Google Classroom:", err);
      }
      if (successCount === 0) {
        setTokenExpired(true);
      }
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadAssignmentStatus = async () => {
    if (user?.email) {
      const res = await fetch(`/api/assignment-status?email=${encodeURIComponent(user.email)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setAssignmentStatus(data);
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadAssignmentStatus();
    }
  }, [user]);

  if (qidParams) {
    return (
      <StudentView 
        qid={qidParams} 
        spreadsheetId={spreadsheetIdParam || spreadsheetId} 
        gasWebAppUrl={gasWebAppUrlParam || gasWebAppUrl} 
      />
    );
  }

  const handleTabChange = (tab: 'bina' | 'bank' | 'semakan') => {
    setActiveTab(tab);
  };

  const handleAdminClick = () => {
    const password = prompt('Sila masukkan kata laluan admin:');
    if (password === 'kea8019') {
      setIsAdminModalOpen(true);
    } else if (password !== null) {
      alert('Kata laluan salah.');
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setToken(token);
        setNeedsAuth(false);
        setFormData(prev => ({ ...prev, namaGuru: user.displayName || '' }));
        loadData(token);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setFormData(prev => ({ ...prev, namaGuru: result.user.displayName || '' }));
        loadData(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCopyPrompt = () => {
    const kriteriaTambahan = promptKriteria.trim() ? `\nKRITERIA GURU (SANGAT PENTING - ANDA WAJIB IKUTI):\n${promptKriteria}\n` : '';
    const videoPrompt = videoUrl ? `\n\nSILA MASUKKAN VIDEO INI SEBAGAI RUJUKAN DI DALAM APLIKASI (Contohnya di bahagian tepi atau atas aplikasi):\n<video src="${videoUrl}" controls width="100%"></video>\nPastikan video ini berfungsi.\n` : '';
    const extVideoPrompt = questionVideoLink.trim() ? `\n\nSILA GUNAKAN PAUTAN VIDEO INI [${questionVideoLink}] SEBAGAI RUJUKAN ATAU PENGENALAN DI DALAM APLIKASI. Anda boleh memaparkannya menggunakan iframe atau menggunakannya sebagai konteks untuk soalan.\n` : '';
    const nyawa = Math.ceil(numQuestions / 2);

    const prompt = `Bertindak sebagai Pakar Pembangun Web Interaktif Pendidikan (Gamified Learning). Tugas anda adalah membina aplikasi kuiz/soalan interaktif berasaskan web (single-file HTML) menggunakan HTML, Tailwind CSS, dan JavaScript yang SANGAT MENARIK, ESTETIK, DAN FUNGSIONAL.

Keperluan Utama:
1. Kreativiti: Cipta soalan baru yang BERBEZA dari gambar contoh tetapi menguji topik/Standard Pembelajaran (SP) yang sama. Ubah nilai, watak, dan senario.
2. Gamifikasi: Sertakan sistem 'Nyawa' (Hearts), 'Skor', dan animasi ganjaran jika jawapan betul.
3. Visual & UX: Gunakan UI moden (Sleek). Pastikan ada kesan visual (Feedback) segera apabila pelajar memilih jawapan (cth: butang bergetar jika salah, kesan glow jika betul).
4. Animasi & Interaksi: Gunakan transisi masuk yang cantik untuk setiap soalan, zarah (particles/confetti) apabila betul/tamat, serta interaksi hover dan aktif pada butang.
5. Responsif: Aplikasi mesti berfungsi sempurna di komputer dan telefon pintar.

KRITERIA WAJIB:
- **Had Saiz:** Pastikan jumlah aksara kod HTML ini adalah padat dan optium (TIDAK LEBIH 45,000 aksara).
- **Jenis Latihan Dinamik:** Tentukan jenis latihan yang paling sesuai (cth: Seret & Lepas, Padankan, Teka Silang Kata, Isi Tempat Kosong, dsb).
- **Tema Beridentiti:** Setiap set soalan mempunyai reka bentuk visual (tema warna, susun atur) yang unik mengikut topik (cth: Fizik - Kosmik, Matematik - Retro).
- **Audio (Web Audio API):** WAJIB guna Web Audio API untuk mensintesis muzik latar (synthesia) yang sedap didengar, menenangkan (lo-fi/ambient/pad) secara berulang (loop) dengan kelantangan perlahan. JANGAN guna link audio/mp3 luar! Hasilkan kord/melodi sintesis yang merdu menggunakan gabungan oscillator (sine/triangle). Sertakan juga bunyi Sfx untuk jawapan betul/salah. Sediakan butang Mute/Unmute.
- **Animasi Penuh:** Wajib ada animasi masuk/keluar yang menyeluruh bagi setiap elemen UI, menggunakan CSS animasi keyframes atau RequestAnimationFrame.
- **Nyawa:** Memandangkan ada ${numQuestions} soalan, berikan pelajar TEPAT ${nyawa} NYAWA (lives) ❤️. Jika salah, tolak 1 nyawa.
- **Bilangan Soalan:** Cipta TEPAT ${numQuestions} soalan berperingkat.
- **Dwibahasa:** Arahan paparan dalam Bahasa Melayu (tebal) dan terjemahan Bahasa Inggeris (condong).

KRITERIA KHAS:${kriteriaTambahan}${videoPrompt}${extVideoPrompt}

**FORMAT JAWAPAN ANDA:**

**1. Maklumat Silibus KSSM (SEBELUM KOD HTML)**
Senaraikan:
- Tingkatan
- Subjek
- Bab
- Standard Pembelajaran (SP) (Hanya nombor SP sahaja)

**2. Kod HTML (DALAM SATU BLOK KOD)**
Sediakan satu fail HTML yang lengkap (termasuk CSS & JS). Pastikan kod anda bersih, teratur, dan sedia untuk disalin terus.

**INTEGRASI MARKAH (SANGAT PENTING):**
Pelajar TIDAK PERLU memasukkan nama atau email mereka di dalam permainan. Sistem pelayan telah memasukkan (inject) maklumat pelajar secara automatik ke dalam objek \`window\`.
Anda boleh menggunakan \`window.USER_NAME\` dan \`window.USER_EMAIL\` untuk memaparkan nama dan email pelajar di antaramuka permainan (contoh: "Selamat Datang, " + window.USER_NAME).

Apabila permainan tamat dan markah akhir (0-100) dikira, anda WAJIB menyertakan dan memanggil fungsi ringkas ini di dalam skrip JavaScript anda untuk menghantar markah ke sistem utama kami.

Sertakan fungsi ini di dalam tag <script> anda:
\`\`\`javascript
function tamatkanPermainan(markahAkhir) {
  // Panggil fungsi hantarMarkahKeSistem yang disediakan oleh sistem pelayan utama
  if (typeof window.hantarMarkahKeSistem === 'function') {
    window.hantarMarkahKeSistem(markahAkhir);
  } else {
    // Fallback jika sistem pelayan tiada
    alert("Permainan Tamat! Markah anda: " + markahAkhir + "%");
  }
}
\`\`\`

Anda perlu memanggil \`tamatkanPermainan(markahAkhir)\` secara automatik sebaik sahaja permainan tamat/selesai. Seterusnya, bina rekaan Sijil Pencapaian digital yang cantik di dalam halaman tamat kuiz untuk memaparkan pencapaian mereka.

**3. Penerangan Kod (SELEPAS KOD HTML)**
Berikan sedikit penerangan ringkas tentang ciri-ciri utama soalan interaktif tersebut di bawah blok kod HTML.

ANALISIS GAMBAR YANG DIBERI DENGAN TELITI.`;

    navigator.clipboard.writeText(prompt);
    alert('Prompt berjaya disalin! Anda boleh tampal (Paste) prompt ini ke Google Gemini.');
    setShowPromptModal(false);
  };

  const handlePreview = () => {
    setPreviewHtml(htmlCode);
  };

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    if (autoHeight) {
      try {
        const iframe = e.currentTarget;
        if (iframe && iframe.contentWindow) {
          setTimeout(() => {
            try {
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              if (doc && doc.body) {
                const height = Math.max(
                  doc.body.scrollHeight,
                  doc.documentElement.scrollHeight,
                  doc.body.offsetHeight,
                  doc.documentElement.offsetHeight
                );
                if (height > 0) {
                  setPreviewHeight(height + 40);
                }
              }
            } catch (err) {
              console.error("Gagal melaras tinggi iframe:", err);
            }
          }, 350);
        }
      } catch (err) {
        console.error("Gagal membaca objek iframe:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Sila log masuk untuk menyimpan soalan.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const currentToken = await getAccessToken();
      if (!currentToken) throw new Error("No token");
      
      await saveQuestionToSheets(currentToken, {
        ...formData,
        html: htmlCode
      }, spreadsheetId, gasWebAppUrl);
      
      // Refresh questions after saving
      await loadData(currentToken, spreadsheetId);
      
      alert('Soalan berjaya disimpan ke Google Sheets!');
      setIsSubmitModalOpen(false);
      setHtmlCode('');
      setPreviewHtml('');
      setFormData(prev => ({
        ...prev,
        tingkatan: '',
        subjek: '',
        bab: '',
        sp: ''
      }));
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan soalan. Sila pastikan anda mempunyai akses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appsScriptCode = `const SHEET_ID = '${spreadsheetId}';
const SHEET_NAME = 'Sheet1';
const WEB_APP_URL = '${gasWebAppUrl || 'https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec'}';

function doGet(e) {
  const action = e.parameter.action;
  if (action === "syncMarkah") {
    const qid = e.parameter.qid || e.parameter.sid;
    const courseId = e.parameter.courseId;
    const assignmentId = e.parameter.assignmentId;
    const result = syncMarkahKeClassroom(qid, courseId, assignmentId);
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  const qid = e.parameter.qid || e.parameter.sid;
  if (!qid) {
    return HtmlService.createHtmlOutput("<h2>Ralat Parameter</h2><p>Sila sertakan ID dalam pautan (e.g., ?qid=SQ-0001 atau ?sid=SS-0001).</p>");
  }

  // Tangkap parameter kelas dan tugasan dari URL (dengan fallback)
  let kelas = e.parameter.kelas || "";
  let tugasan = e.parameter.tugasan || "";
  const kod = e.parameter.kod || "";
  
  // Jika ada kod unik, cuba buat carian dinamik dari tab TUGASAN
  if (kod) {
    try {
      const ssLookup = SpreadsheetApp.openById(SHEET_ID);
      const sheetTugasan = ssLookup.getSheetByName("TUGASAN");
      if (sheetTugasan) {
        const lastRowT = sheetTugasan.getLastRow();
        if (lastRowT >= 2) {
          const dataTugasan = sheetTugasan.getRange(2, 1, lastRowT - 1, 4).getValues();
          for (let i = 0; i < dataTugasan.length; i++) {
            const rowKod = dataTugasan[i][3] ? dataTugasan[i][3].toString().trim().toUpperCase() : "";
            if (rowKod === kod.toString().trim().toUpperCase()) {
              if (!kelas) kelas = dataTugasan[i][0] ? dataTugasan[i][0].toString().trim() : "";
              if (!tugasan) tugasan = dataTugasan[i][2] ? dataTugasan[i][2].toString().trim() : "";
              break;
            }
          }
        }
      }
    } catch (lookupErr) {
      console.error("Gagal carian TUGASAN: " + lookupErr.message);
    }
  }
  
  if (!kelas) kelas = "Tiada Kelas";
  if (!tugasan) tugasan = "Tiada Tugasan";
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let htmlCode = "";
    
    // CARI DALAM TAB SIMULASI (Jika ID bermula dengan SS- atau demo ID)
    if (qid.startsWith("SS-") || qid === "sim_ketumpatan" || qid === "sim_bandul") {
      const sheetSim = ss.getSheetByName("SIMULASI");
      if (sheetSim) {
        const lastRow = sheetSim.getLastRow();
        const lastCol = sheetSim.getLastColumn();
        if (lastRow >= 2) {
          const data = sheetSim.getRange(1, 1, lastRow, lastCol).getValues();
          const header = data[0];
          // Cari kolum ID SIMULASI (indeks 6 / G)
          const idIndex = header.indexOf("ID SIMULASI") > -1 ? header.indexOf("ID SIMULASI") : 6;
          
          for (let i = 1; i < data.length; i++) {
            let currentId = data[i][idIndex] ? data[i][idIndex].toString().trim() : "";
            if (currentId === qid) {
              // Gabungkan HTML dari kolum E (4), F (5) dan I (8) onwards
              htmlCode = (data[i][4] || "") + (data[i][5] || "");
              if (data[i].length > 8) {
                for (let j = 8; j < data[i].length; j++) {
                  htmlCode += (data[i][j] || "");
                }
              }
              break;
            }
          }
        }
      }
      
      // FALLBACK UNTUK DEMO JIKA TIDAK JUMPA DI SHEET
      if (!htmlCode) {
        if (qid === "sim_ketumpatan") {
          htmlCode = '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-blue-400 mb-4">Simulasi Ketumpatan (Demo)</h2><div class="flex flex-col md:flex-row gap-6"><div class="w-full md:w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700"><label class="block text-sm font-bold mb-2">Pilih Cecair:</label><select id="liquid" class="w-full bg-slate-900 p-2 rounded border border-slate-600 mb-4"><option value="1.0">Air (1.0)</option><option value="0.9">Minyak (0.9)</option><option value="1.4">Madu (1.4)</option></select><label class="block text-sm font-bold mb-2">Jatuhkan Bahan:</label><div class="flex gap-2"><button onclick="drop(\\'Gabus\\', 0.24)" class="flex-1 bg-orange-700 p-2 rounded">Gabus</button><button onclick="drop(\\'Besi\\', 7.87)" class="flex-1 bg-slate-500 p-2 rounded">Besi</button></div><button onclick="resetSim()" class="w-full mt-4 bg-red-600 p-2 rounded">Reset</button></div><div class="w-full md:w-2/3 h-64 bg-slate-950 rounded-xl relative border border-slate-800 flex justify-center items-end p-8"><div id="beaker" class="w-48 h-56 border-4 border-t-0 border-blue-900 rounded-b-2xl relative overflow-hidden flex flex-col justify-end"><div id="water" class="w-full h-1/2 bg-blue-500/30 border-t-2 border-blue-400"></div><div id="objects" class="absolute inset-0"></div></div></div></div><table class="w-full mt-6 text-sm border border-slate-700"><thead class="bg-slate-800"><tr><th class="p-2 border">Bahan</th><th class="p-2 border">Keputusan</th></tr></thead><tbody id="results"></tbody></table><script>function drop(n,d){const l=parseFloat(document.getElementById(\\'liquid\\').value);const r=d>l?\\'Tenggelam\\':\\'Terapung\\';const o=document.createElement(\\'div\\');o.className=\\'absolute text-xs text-center\\';o.style.left=(Math.random()*60+20)+\\'%\\';o.style.top=r===\\'Terapung\\'?\\'40%\\':\\'80%\\';o.innerHTML=\\'<div class="bg-black/50 px-1 rounded">\\'+n+\\'</div><div class="w-8 h-8 rounded \\'+(n===\\'Gabus\\'?\\'bg-orange-700\\':\\'bg-slate-500\\')+\\'"></div>\\';document.getElementById(\\'objects\\').appendChild(o);const tr=document.createElement(\\'tr\\');tr.innerHTML=\\'<td class="p-2 border">\\'+n+\\'</td><td class="p-2 border">\\'+r+\\'</td>\\';document.getElementById(\\'results\\').appendChild(tr)}function resetSim(){document.getElementById(\\'objects\\').innerHTML=\\'\\';document.getElementById(\\'results\\').innerHTML=\\'\\'}</script></body></html>';
        } else if (qid === "sim_bandul") {
          htmlCode = '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-fuchsia-400 mb-4">Bandul Ringkas (Demo)</h2><div class="flex flex-col md:flex-row gap-6"><div class="w-full md:w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700"><label class="block text-sm mb-1">Panjang: <span id="lenVal">50</span>cm</label><input type="range" id="len" min="20" max="100" value="50" oninput="document.getElementById(\\'lenVal\\').innerText=this.value" class="w-full mb-4"><button id="btn" onclick="toggle()" class="w-full bg-fuchsia-600 p-3 rounded-xl font-bold">MULA</button><div class="grid grid-cols-2 gap-4 mt-4 text-center"><div class="bg-slate-950 p-2 rounded border border-slate-700"><div class="text-[10px]">MASA (s)</div><div id="time" class="text-xl font-mono text-fuchsia-400">0.00</div></div><div class="bg-slate-950 p-2 rounded border border-slate-700"><div class="text-[10px]">AYUNAN</div><div id="count" class="text-xl font-mono text-emerald-400">0/10</div></div></div></div><div class="w-full md:w-2/3 h-64 bg-slate-950 rounded-xl relative overflow-hidden flex justify-center"><div id="pend" class="absolute top-0 origin-top" style="height:150px"><div class="w-0.5 h-full bg-slate-300 mx-auto"></div><div class="w-6 h-6 bg-pink-500 rounded-full -mt-3 mx-auto"></div></div></div></div><script>let r=false,s,req;function toggle(){const b=document.getElementById(\\'btn\\');if(r){cancelAnimationFrame(req);r=false;b.innerText=\\'MULA\\';return}r=true;b.innerText=\\'BERHENTI\\';s=performance.now();const l=document.getElementById(\\'len\\').value;const p=2*Math.PI*Math.sqrt(l/100/9.81);function animate(t){const e=(t-s)/1000;const a=-0.5*Math.cos((2*Math.PI/p)*e);document.getElementById(\\'pend\\').style.transform=\\'rotate(\\'+a+\\'rad)\\';document.getElementById(\\'time\\').innerText=e.toFixed(2);const o=Math.floor(e/p);document.getElementById(\\'count\\').innerText=Math.min(10,o)+\\'/10\\';if(o>=10){r=false;b.innerText=\\'MULA\\';return}req=requestAnimationFrame(animate)}req=requestAnimationFrame(animate)}</script></body></html>';
        }
      }
    }

    // CARI DALAM TAB SOALAN (Jika belum jumpa atau ID bermula dengan SQ-)
    if (!htmlCode) {
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow >= 2) {
          const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
          const header = data[0];
          const htmlIndex = header.indexOf("CODE HTML");
          const idIndex = header.indexOf("ID Soalan");
          
          if (htmlIndex > -1 && idIndex > -1) {
            for (let i = 1; i < data.length; i++) {
              let currentId = data[i][idIndex] ? data[i][idIndex].toString().trim() : "";
              if (currentId === qid) { 
                // Gabungkan HTML dari kolum HTML dan kolum selepas Link (J onwards)
                htmlCode = data[i][htmlIndex]; 
                // Kolum J adalah index 9
                if (data[i].length > 9) {
                  for (let j = 9; j < data[i].length; j++) {
                    htmlCode += (data[i][j] || "");
                  }
                }
                break;
              }
            }
          }
        }
      }
    }
    
    if (!htmlCode) return HtmlService.createHtmlOutput("<h2>Ralat</h2><p>Data tidak dijumpai bagi ID: " + qid + "</p>");
    
    // Tarik data e-mel pelajar yang sedang buka link
    let userEmail = "";
    try { 
      const activeEmail = Session.getActiveUser().getEmail();
      if (activeEmail) {
        userEmail = activeEmail;
      }
    } catch (err) {
      userEmail = ""; 
    }
    
    let userName = "";
    try {
      if (userEmail) {
        // Tarik nama dari Google Classroom jika e-mel sah DELIMa
        const profile = Classroom.UserProfiles.get(userEmail);
        userName = profile.name.fullName;
      }
    } catch (apiErr) {
      if (userEmail) userName = userEmail.split('@')[0].toUpperCase(); 
    }
    
    // Jika bukan akaun DELIMa (tidak berakhir dengan moe-dl.edu.my), kosongkan untuk paksa Popup Manual Entry
    if (userEmail && !userEmail.toLowerCase().endsWith("moe-dl.edu.my")) {
      userEmail = "";
      userName = "";
    }
    userEmail = userEmail || "";
    userName = userName || "";
    
    // Suntik skrip ke dalam HTML soalan (Dengan parameter kelas dan tugasan)
    const scriptToInject = 
      "<script>" +
      "  window.USER_EMAIL = " + JSON.stringify(userEmail) + ";" +
      "  window.USER_NAME = " + JSON.stringify(userName) + ";" +
      "  window.QID = " + JSON.stringify(qid) + ";" +
      "  window.KELAS = " + JSON.stringify(kelas) + ";" +
      "  window.TUGASAN = " + JSON.stringify(tugasan) + ";" +
      "  window.KOD = " + JSON.stringify(kod) + ";" +
      "  window.addEventListener('DOMContentLoaded', function() {" +
      "    function mulakanSesi(nama, emel) {" +
      "      window.USER_NAME = nama;" +
      "      window.USER_EMAIL = emel;" +
      "      try { localStorage.setItem('delima_name', nama); localStorage.setItem('delima_email', emel); } catch(e) {}" +
      "      google.script.run.kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, '', 'Sedang menjawab');" +
      "      var popup = document.getElementById('delima-login-popup');" +
      "      if (popup) popup.remove();" +
      "    }" +
      "    if (!window.USER_EMAIL) {" +
      "       try {" +
      "         var savedName = localStorage.getItem('delima_name');" +
      "         var savedEmail = localStorage.getItem('delima_email');" +
      "         if (savedName && savedEmail) {" +
      "           mulakanSesi(savedName, savedEmail);" +
      "           return;" +
      "         }" +
      "       } catch(e) {}" +
      "       var popup = document.createElement('div');" +
      "       popup.id = 'delima-login-popup';" +
      "       popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(248,250,252,0.95);backdrop-filter:blur(5px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:20px;box-sizing:border-box;';" +
      "       popup.innerHTML = '<div style=\"background:white;padding:30px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);max-width:400px;width:100%;border:1px solid #e2e8f0;text-align:center;\">' +" +
      "         \'<div style=\"font-size:40px;margin-bottom:15px;\">🎓</div>\' +" +
      "         \'<h2 style=\"color:#1e293b;margin:0 0 10px 0;font-size:22px;\">Pengesahan Identiti</h2>\' +" +
      "         \'<p style=\"color:#64748b;font-size:14px;margin-bottom:25px;line-height:1.5;\">Sila masukkan maklumat anda untuk membolehkan guru merekod markah.</p>\' +" +
      "         \'<div style=\"text-align:left;margin-bottom:15px;\"><label style=\"display:block;font-size:12px;font-weight:bold;color:#475569;margin-bottom:5px;text-transform:uppercase;\">Nama Penuh (Wajib / Huruf Besar)</label><input type=\"text\" id=\"input-nama\" placeholder=\"MASUKKAN NAMA PENUH ANDA\" style=\"width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;color:#000;font-weight:bold;text-transform:uppercase;\"></div>\' +" +
      "         \'<div style=\"text-align:left;margin-bottom:25px;\"><label style=\"display:block;font-size:12px;font-weight:bold;color:#475569;margin-bottom:5px;text-transform:uppercase;\">E-mel (Pilihan)</label><input type=\"email\" id=\"input-emel\" placeholder=\"Contoh: pelajar@gmail.com (Boleh dikosongkan)\" style=\"width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:monospace;box-sizing:border-box;outline:none;color:#000;font-weight:bold;\"><p style=\"font-size:11px;color:#94a3b8;margin-top:5px;\">E-mel adalah pilihan. Boleh dikosongkan jika tiada.</p></div>\' +" +
      "         \'<button id=\"btn-mula\" style=\"width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;transition:background 0.2s;\">Mula Menjawab</button>\' +" +
      "       \'</div>\';" +
      "       document.body.appendChild(popup);" +
      "       document.getElementById(\'btn-mula\').onclick = function() {" +
      "         var nama = document.getElementById(\'input-nama\').value.trim().toUpperCase();" +
      "         var emel = document.getElementById(\'input-emel\').value.trim().toLowerCase();" +
      "         if (!nama) { alert(\'Sila masukkan nama penuh anda.\'); return; }" +
      "         if (emel && emel.indexOf(\'@\') === -1) { alert(\'Sila masukkan e-mel yang sah.\'); return; }" +
      "         mulakanSesi(nama, emel);" +
      "       };" +
      "    } else {" +
      "       google.script.run.kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, '', 'Sedang menjawab');" +
      "    }" +
      "    window.hantarMarkahKeSistem = function(markah) {" +
      "      google.script.run.withSuccessHandler(function() {" +
      "        alert('Markah anda (' + markah + '%) telah berjaya direkodkan!');" +
      "      }).kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, markah, 'Telah menjawab');" +
      "    };" +
      "  });" +
      "</script>";
    
    let injectedHtml = htmlCode.match(/<\\/head>/i) ? htmlCode.replace(/<\\/head>/i, scriptToInject + "</head>") : scriptToInject + htmlCode;
    
    const htmlOutput = HtmlService.createHtmlOutput(injectedHtml);
    htmlOutput.setTitle("Soalan Interaktif: " + qid);
    htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return htmlOutput;
    
  } catch (err) {
    return HtmlService.createHtmlOutput("<p>Ralat: " + err.toString() + "</p>");
  }
}

// Fungsi dipanggil secara 'live' dari HTML untuk update Sheet Markah Murid (Lengkap 10 lajur)
function kemaskiniMarkah(qid, nama, email, kelas, tugasan, kod, markah, status) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName("Markah Murid");
    
    // Cipta atau naik taraf lajur "Markah Murid" secara automatik untuk 10 lajur
    const headerRow = ["Waktu Menjawab", "ID Soalan", "Nama Murid", "Email Murid", "Kelas", "Tugasan", "Markah (%)", "Status", "Status Sync GC", "Kod Unik"];
    if (!sheet) {
      sheet = ss.insertSheet("Markah Murid");
      sheet.getRange(1, 1, 1, 10).setValues([headerRow]);
    } else {
      const lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        sheet.getRange(1, 1, 1, 10).setValues([headerRow]);
      } else {
        const firstRowVals = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), 10)).getValues()[0];
        if (firstRowVals.length < 10 || firstRowVals.indexOf("Kod Unik") === -1) {
          // Naik taraf struktur helaian lama ke struktur baru 10 lajur secara automatik
          sheet.getRange(1, 1, 1, 10).setValues([headerRow]);
        }
      }
    }
    
    const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const markahStr = (markah !== "" && markah != null) ? markah + "%" : "-";
    
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    
    // Semak jika pelajar ini dah pernah buka/jawab soalan ini
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === qid && data[i][3] === email) {
        rowIdx = i + 1;
        break;
      }
    }
    
    const rowData = [timestamp, qid, nama, email, kelas || "Tiada Kelas", tugasan || "Tiada Tugasan", markahStr, status, "", kod || ""];
    
    if (rowIdx !== -1) {
      // Dapatkan status sedia ada
      const existingStatus = data[rowIdx - 1].length >= 8 ? data[rowIdx - 1][7] : data[rowIdx - 1][5];
      const normalizedExisting = (existingStatus || "").toString().toLowerCase().trim();
      const normalizedNew = (status || "").toString().toLowerCase().trim();
      
      // Jika dah siap jawab, abaikan status "Sedang menjawab" jika pelajar ter-refresh page
      if (normalizedExisting === 'telah menjawab' && normalizedNew === 'sedang menjawab') return;
      
      const numCols = 10;
      sheet.getRange(rowIdx, 1, 1, numCols).setValues([rowData.slice(0, numCols)]);
    } else {
      sheet.appendRow(rowData);
    }
  } catch (e) {
    console.error(e);
  }
}

// Fungsi menyegerakan markah dari Sheet "Markah Murid" ke Google Classroom (Sokong 6 dan 8 lajur)
function syncMarkahKeClassroom(qid, courseId, assignmentId) {
  var report = { successCount: 0, failCount: 0 };
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName("Markah Murid");
    if (!sheet) {
      return { success: false, message: "Helaian 'Markah Murid' tidak dijumpai." };
    }
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return { success: false, message: "Tiada data murid untuk di-sync dalam helaian 'Markah Murid'." };
    }
    
    // Pastikan lajur wujud untuk Status Sync GC (Lajur G/7 untuk format lama, Lajur I/9 untuk format baru)
    const headerRow = values[0];
    const isNewFormat = headerRow.length >= 8 && headerRow.indexOf("Kelas") !== -1;
    const syncColIdx = isNewFormat ? 9 : 7;
    const syncColLetter = isNewFormat ? "I" : "G";
    
    if (headerRow.length < syncColIdx) {
      sheet.getRange(1, syncColIdx).setValue("Status Sync GC");
    }
    
    // Dapatkan senarai submission dari Classroom
    var submissionsList = [];
    try {
      var optionalArgs = {
        states: ["NEW", "CREATED", "TURNED_IN", "RETURNED"]
      };
      var response = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, assignmentId, optionalArgs);
      submissionsList = response.studentSubmissions || [];
    } catch (apiErr) {
      console.error("Gagal menarik senarai dari Google Classroom", apiErr);
      return { success: false, message: "Gagal menarik senarai dari Google Classroom. Pastikan Classroom API diaktifkan." };
    }
    
    // Bina map email murid -> id submission
    var emailToSubmission = {};
    for (var s of submissionsList) {
      if (s.userId) {
        try {
          var userProfile = Classroom.UserProfiles.get(s.userId);
          var email = userProfile.emailAddress.toLowerCase().trim();
          emailToSubmission[email] = s;
        } catch (profileErr) {
          console.error("Gagal mendapatkan profil pengguna " + s.userId, profileErr);
        }
      }
    }
    
    // Lakukan pemadanan dan penyegerakan
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowQid = row[1] ? row[1].toString().trim() : "";
      if (rowQid !== qid) continue;
      
      const email = row[3] ? row[3].toString().trim().toLowerCase() : "";
      if (!email) continue;
      
      // Mengesan markah secara dinamik (lajur 7 (row[6]) untuk format baru, lajur 5 (row[4]) untuk format lama)
      const markahRaw = row.length >= 8 
        ? (row[6] ? row[6].toString().trim() : "")
        : (row[4] ? row[4].toString().trim() : "");
        
      if (markahRaw === "-" || !markahRaw) continue;
      
      // Bersihkan markah (buang % dan tukar ke nombor)
      const markahNum = parseInt(markahRaw.replace("%", ""));
      if (isNaN(markahNum)) continue;
      
      const s = emailToSubmission[email];
      if (s) {
        try {
          // Cari gred tugasan untuk tahu maxPoints
          const courseWork = Classroom.Courses.CourseWork.get(courseId, assignmentId);
          const maxPoints = courseWork.maxPoints || 100;
          const finalGrade = Math.round((markahNum / 100) * maxPoints);
          
          Classroom.Courses.CourseWork.StudentSubmissions.patch(
            {
              draftGrade: finalGrade,
              assignedGrade: finalGrade
            },
            courseId,
            assignmentId,
            s.id,
            { updateMask: "draftGrade,assignedGrade" }
          );
          
          sheet.getRange(i + 1, syncColIdx).setValue("Telah di-sync ke GC");
          report.successCount++;
        } catch (patchErr) {
          console.error("Gagal menampal markah " + email, patchErr);
          sheet.getRange(i + 1, syncColIdx).setValue("Gagal: " + patchErr.toString());
          report.failCount++;
        }
      } else {
        sheet.getRange(i + 1, syncColIdx).setValue("Gagal: E-Mel tiada dalam GC");
        report.failCount++;
      }
    }
    
    return {
      success: true,
      message: report.successCount + " markah berjaya di-sync ke Google Classroom (" + syncColLetter + "), " + report.failCount + " gagal dikesan/di-sync."
    };
    
  } catch (err) {
    return {
      success: false,
      message: "Ralat Utama: " + err.toString()
    };
  }
}

// Trigger automatik kemas kini URL (Kekal sama)
function onEdit(e) {
  if (!e) return;
  const range = e.range;
  const sheetName = range.getSheet().getName();
  if (sheetName === SHEET_NAME) {
    if (range.getColumn() <= 8 && range.getLastColumn() >= 8) janaLinkUniversal(SHEET_NAME, "ID Soalan", 8, 9);
  } else if (sheetName === "SIMULASI") {
    if (range.getColumn() <= 7 && range.getLastColumn() >= 7) janaLinkUniversal("SIMULASI", "ID SIMULASI", 7, 8);
  }
}

function janaLinkUniversal(sName, idColName, idColIdx, linkColIdx) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sName);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const data = sheet.getRange(1, 1, lastRow, Math.max(idColIdx, linkColIdx)).getValues();
  const valuesLink = sheet.getRange(2, linkColIdx, lastRow - 1, 1).getValues();
  let changed = false;
  for (let i = 1; i < data.length; i++) {
    const qid = data[i][idColIdx - 1] ? data[i][idColIdx - 1].toString().trim() : "";
    if (qid) {
      const link = WEB_APP_URL + (qid.startsWith("SS-") ? "?sid=" : "?qid=") + qid;
      if (valuesLink[i-1][0] !== link) {
        valuesLink[i-1][0] = link;
        changed = true;
      }
    }
  }
  if (changed) sheet.getRange(2, linkColIdx, lastRow - 1, 1).setValues(valuesLink);
}

// Tambah Menu Custom di Spreadsheet untuk kemudahan Guru
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Pengurusan Classroom')
    .addItem('Hantar Tugasan ke Google Classroom', 'postKeClassroom')
    .addItem('Sync Markah ke Google Classroom', 'syncMarkahKeGC')
    .addItem('Sync & Bersihkan Tugasan Terpadam', 'syncClassroom')
    .addToUi();
}

function syncMarkahKeGC() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetMarkah = ss.getSheetByName("Markah Murid");
  const sheetTugasan = ss.getSheetByName("TUGASAN");
  
  if (!sheetMarkah || !sheetTugasan) {
    SpreadsheetApp.getUi().alert("Ralat: Tab 'Markah Murid' atau 'TUGASAN' tidak dijumpai.");
    return;
  }
  
  const lastRowMarkah = sheetMarkah.getLastRow();
  if (lastRowMarkah < 2) return;
  
  const lastRowTugasan = sheetTugasan.getLastRow();
  let dataTugasan = [];
  if (lastRowTugasan >= 2) {
    dataTugasan = sheetTugasan.getRange(2, 1, lastRowTugasan - 1, 8).getValues();
  }
  
  const dataMarkah = sheetMarkah.getRange(2, 1, lastRowMarkah - 1, 10).getValues();
  let syncedCount = 0;
  
  for (let i = 0; i < dataMarkah.length; i++) {
    const row = dataMarkah[i];
    const emailMurid = row[3];
    const kelas = row[4];
    const tugasan = row[5];
    const markahString = row[6];
    const status = row[7];
    const statusSync = row[8];
    const kodUnikMarkah = row[9];
    const rowIndex = i + 2;
    
    if (status === "Telah menjawab" && (!statusSync || statusSync.indexOf("Berjaya") === -1)) {
      try {
        let courseId = "";
        let courseWorkId = "";
        
        for (let j = 0; j < dataTugasan.length; j++) {
          const tKelas = dataTugasan[j][0];
          const tKod = dataTugasan[j][3];
          const tTugasan = dataTugasan[j][2];
          
          const matchByKod = kodUnikMarkah && tKod && kodUnikMarkah.toString().trim().toUpperCase() === tKod.toString().trim().toUpperCase();
          const matchByName = tKelas === kelas && tTugasan === tugasan;
          
          if (matchByKod || (!kodUnikMarkah && matchByName)) {
            courseId = dataTugasan[j][6];
            courseWorkId = dataTugasan[j][7];
            break;
          }
        }
        
        if (!courseId || !courseWorkId) {
          sheetMarkah.getRange(rowIndex, 9).setValue("Ralat: Tugasan tiada di sistem");
          continue;
        }
        
        const response = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, courseWorkId, { userId: emailMurid });
        const submissions = response.studentSubmissions || [];
        
        if (submissions.length === 0) {
          sheetMarkah.getRange(rowIndex, 9).setValue("Ralat: Tiada submission dijumpai");
          continue;
        }
        
        const submission = submissions[0];
        const markahNum = parseInt(markahString.toString().replace("%", "").trim(), 10) || 0;
        
        Classroom.Courses.CourseWork.StudentSubmissions.patch({
          assignedGrade: markahNum,
          draftGrade: markahNum
        }, courseId, courseWorkId, submission.id, { updateMask: "assignedGrade,draftGrade" });
        
        const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        sheetMarkah.getRange(rowIndex, 9).setValue("Berjaya di-sync: " + timestamp);
        syncedCount++;
      } catch (e) {
        sheetMarkah.getRange(rowIndex, 9).setValue("Ralat: " + e.message);
      }
    }
  }
  
  SpreadsheetApp.getUi().alert("Proses sync selesai. Jumlah pelajar berjaya di-sync: " + syncedCount);
}

function postKeClassroom() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TUGASAN");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Ralat: Tab 'TUGASAN' tidak dijumpai.");
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const namaKelas = row[0];
    const namaTugasan = row[2];
    const linkTugasan = row[5];
    const courseIdCheck = row[6];
    const courseWorkIdCheck = row[7];
    
    if (courseIdCheck && courseWorkIdCheck) {
      continue; // Skip if already posted
    }
    
    try {
      let courseId = "";
      const response = Classroom.Courses.list({ courseStates: ["ACTIVE"] });
      const courses = response.courses || [];
      for (let j = 0; j < courses.length; j++) {
        if (courses[j].name === namaKelas) {
          courseId = courses[j].id;
          break;
        }
      }
      
      if (!courseId) {
        SpreadsheetApp.getActiveSpreadsheet().toast("Ralat: Kelas '" + namaKelas + "' tiada atau tidak aktif.", "Pengurusan Classroom");
        continue;
      }
      
      const courseWork = {
        title: namaTugasan,
        state: "PUBLISHED",
        workType: "ASSIGNMENT",
        maxPoints: 100,
        materials: [{ link: { url: linkTugasan } }]
      };
      
      const createdCourseWork = Classroom.Courses.CourseWork.create(courseWork, courseId);
      
      sheet.getRange(i + 2, 7).setValue(courseId); // Column G (Course ID)
      sheet.getRange(i + 2, 8).setValue(createdCourseWork.id); // Column H (Coursework ID)
      SpreadsheetApp.getActiveSpreadsheet().toast("Tugasan '" + namaTugasan + "' berjaya dihantar ke kelas '" + namaKelas + "'.", "Pengurusan Classroom");
    } catch (e) {
      SpreadsheetApp.getActiveSpreadsheet().toast("Ralat (" + namaKelas + "): " + e.message, "Pengurusan Classroom");
    }
  }
}

function syncClassroom() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("TUGASAN");
  const sheetMarkah = ss.getSheetByName("Markah Murid");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Ralat: Tab 'TUGASAN' tidak dijumpai.");
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  let rowsDeleted = 0;
  let uniqueCodesDeleted = [];
  
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const courseId = row[6];
    const courseWorkId = row[7];
    const kodUnik = row[3] ? row[3].toString().toUpperCase().trim() : "";
    const rowIndex = i + 2;
    
    if (courseId && courseWorkId) {
      try {
        Classroom.Courses.CourseWork.get(courseId, courseWorkId);
      } catch (e) {
        const errMsg = e.message || "";
        if (errMsg.indexOf("NOT_FOUND") !== -1 || errMsg.indexOf("404") !== -1 || errMsg.indexOf("not found") !== -1) {
          sheet.deleteRow(rowIndex);
          rowsDeleted++;
          if (kodUnik) {
            uniqueCodesDeleted.push(kodUnik);
          }
        }
      }
    }
  }
  
  let markahDeleted = 0;
  if (sheetMarkah && uniqueCodesDeleted.length > 0) {
    const lastRowMarkah = sheetMarkah.getLastRow();
    if (lastRowMarkah >= 2) {
      const dataMarkah = sheetMarkah.getRange(2, 10, lastRowMarkah - 1, 1).getValues(); // Column J (Kod Unik)
      for (let j = dataMarkah.length - 1; j >= 0; j--) {
        const rowKodUnik = dataMarkah[j][0] ? dataMarkah[j][0].toString().toUpperCase().trim() : "";
        if (rowKodUnik && uniqueCodesDeleted.indexOf(rowKodUnik) !== -1) {
          sheetMarkah.deleteRow(j + 2);
          markahDeleted++;
        }
      }
    }
  }
  
  if (rowsDeleted > 0) {
    let msg = "Berjaya menyegerakkan. " + rowsDeleted + " tugasan yang terpadam di Classroom telah dibuang dari senarai.";
    if (markahDeleted > 0) {
      msg += "\\nSebanyak " + markahDeleted + " rekod markah murid yang sepadan juga telah dibuang dari 'Markah Murid'.";
    }
    SpreadsheetApp.getUi().alert(msg);
  } else {
    SpreadsheetApp.getUi().alert("Penyegerakan selesai. Tiada tugasan yang terpadam dijumpai.");
  }
}
`;

  const handleSaveGeneratedToBankFromStudio = async (newQuestion: {
    idSoalan: string;
    namaGuru: string;
    tingkatan: string;
    subjek: string;
    bab: string;
    sp: string;
    html: string;
  }) => {
    if (!token) {
      alert("Sila log masuk dengan akaun Google anda terlebih dahulu.");
      return;
    }
    await saveQuestionToSheets(token, newQuestion, spreadsheetId);
    const updated = await getQuestionsFromSheets(token, spreadsheetId);
    setQuestions(updated);
  };

  const handleSaveSimulasi = async (newSim: {
    namaGuru: string;
    tingkatan: string;
    bab: string;
    html: string;
  }) => {
    if (!token) {
      alert("Sila log masuk dengan akaun Google anda terlebih dahulu.");
      return;
    }
    const res = await saveSimulasiToSheets(token, newSim, spreadsheetId);
    const sims = await getSimulasiFromSheets(token, spreadsheetId);
    setSimulasiList(sims);
    return res;
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-[#1e2330] text-white flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 py-4 shadow-md z-20 relative">
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0 mr-4">
          <img src="https://i.ibb.co/qLXmgMqr/logo.png" alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain shrink-0" onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/40?text=Logo")} />
          <div className="min-w-0">
            <h1 className="font-extrabold text-base sm:text-xl leading-tight tracking-wide truncate bg-gradient-to-r from-white via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
              SISTEM PENGUJIAN & GAMIFIKASI SMK JENERI
            </h1>
            <p className="hidden sm:block text-xs text-cyan-300/80 truncate">
              Platform Pendidikan Dual-Mod KSSM (Google Classroom & Gemini AI)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 mt-3 md:mt-0">
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-800/80 rounded-full pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1 sm:py-1.5 border border-slate-600/50">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Profile" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-slate-600 shrink-0" />
              <span className="font-semibold text-slate-200 text-xs sm:text-sm max-w-[70px] sm:max-w-[120px] lg:max-w-[180px] truncate" title={user.displayName || 'Guru'}>
                {user.displayName?.toUpperCase() || 'GURU'}
              </span>
              <button 
                onClick={handleLogout} 
                className="ml-1 sm:ml-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 text-[10px] sm:text-xs font-bold bg-red-900/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-red-900/50 transition shrink-0"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center shadow-sm transition"
            >
              <div className="bg-white rounded-full p-0.5 mr-1.5 sm:mr-2 shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="leading-tight text-center sm:text-left">Log Masuk<br className="hidden lg:block xl:hidden" /> Google</span>
            </button>
          )}

          <button 
            onClick={handleAdminClick} 
            className="hidden md:flex items-center space-x-1.5 sm:space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition border border-slate-600/50 shadow-sm shrink-0"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-purple-300" />
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* DUAL MODE SELECTOR (Moved outside header) */}
      {!isSimulationActive && (
        <div className="bg-slate-900 border-b border-slate-800 shadow-sm z-30 relative">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-center items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button
                onClick={() => { setSystemMode('soalan_interaktif'); }}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
                  systemMode === 'soalan_interaktif'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>📝</span>
                <span>MOD 1: PENGUJIAN INTERAKTIF</span>
              </button>

              <button
                onClick={() => { setSystemMode('live_gamification'); }}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
                  systemMode === 'live_gamification'
                    ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 text-white shadow-lg shadow-fuchsia-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Gamepad2 className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span>MOD 2: GAMIFIKASI & SIMULASI LIVE</span>
              </button>
            </div>
            
            {systemMode === 'soalan_interaktif' && (
              <div className="flex bg-[#2a3441] rounded-2xl p-1.5 border border-slate-600/50 shadow-inner">
                <button 
                  onClick={() => handleTabChange('bina')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === 'bina' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
                >
                  <span>👩‍🏫</span>
                  <span className="hidden sm:inline">BINA SOALAN</span>
                </button>
                <button 
                  onClick={() => handleTabChange('bank')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === 'bank' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
                >
                  <span>📁</span>
                  <span className="hidden sm:inline">TUGASAN</span>
                </button>
                <button 
                  onClick={() => handleTabChange('semakan')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === 'semakan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
                >
                  <CheckCircle className={`w-4 h-4 ${activeTab === 'semakan' ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="hidden sm:inline">SEMAKAN GURU</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER ACTIVE MODE */}
      {systemMode === 'live_gamification' ? (
        <LiveGamificationStudio 
          questions={questions}
          simulasiList={simulasiList}
          userEmail={user?.email || undefined}
          userName={user?.displayName || undefined}
          classes={classes}
          spreadsheetId={spreadsheetId}
          gasWebAppUrl={gasWebAppUrl}
          token={token}
          onSaveToBank={handleSaveGeneratedToBankFromStudio}
          onSaveSimulasi={handleSaveSimulasi}
          onActiveSimulationChange={setIsSimulationActive}
        />
      ) : (
        <>
          {/* MAIN CONTENT FOR MODE 1: SOALAN INTERAKTIF */}
      {activeTab === 'bina' && (
        <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-4 lg:gap-6 lg:h-[calc(100vh-76px)] overflow-y-auto lg:overflow-hidden pb-20 sm:pb-6">
          {/* LEFT PANEL */}
        <div className="w-full lg:w-[350px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 lg:h-full">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-500" />
              <div className="text-sm font-semibold text-slate-700 leading-tight">Ruangan Kod<br/>HTML</div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="text-[10px] font-medium text-slate-500 leading-tight text-right">Bil.<br/>Soalan:</div>
              <input 
                type="number" 
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-10 h-8 border border-slate-200 rounded text-center text-sm focus:border-blue-500 outline-none"
                min="1"
                max="20"
              />
            </div>
            
            <button 
              onClick={() => setShowPromptModal(true)}
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:opacity-90 text-white px-3 py-1.5 rounded-md flex items-center transition shadow-sm"
            >
              <span className="mr-1.5 text-xs opacity-90">💡</span>
              <div className="text-xs font-bold leading-tight text-left">Prompt<br/>Gemini</div>
            </button>
          </div>

          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-slate-600 uppercase tracking-wider font-semibold">
                <Code className="w-4 h-4 text-slate-400" />
                <span className="text-xs leading-tight">Kod HTML<br/>Soalan</span>
              </div>
              <div className="flex gap-2">
                {htmlCode.trim().length === 0 ? (
                  <button 
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setHtmlCode(text);
                        } else {
                          alert('Sila tampal secara manual (Ctrl+V / Cmd+V) dalam ruangan di bawah.');
                        }
                      } catch (e) {
                        alert('Gagal membaca clipboard. Sila tampal secara manual (Ctrl+V / Cmd+V) dalam ruangan di bawah.');
                      }
                    }}
                    className="text-[10px] text-emerald-600 hover:bg-emerald-100 font-medium flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded w-[76px] transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="leading-tight text-left">Tampal<br/>Kod</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setHtmlCode('');
                      setPreviewHtml('');
                    }}
                    className="text-[10px] text-red-600 hover:bg-red-100 font-medium flex items-center justify-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1.5 rounded w-[76px] transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="leading-tight text-left">Padam<br/>Semua</span>
                  </button>
                )}
              </div>
            </div>
            
            <textarea 
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="<!-- Tampal kod HTML interaktif anda di sini... -->"
              className="flex-1 min-h-[150px] lg:min-h-0 w-full border border-slate-300 rounded-lg p-3 font-mono text-sm resize-y lg:resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <div className="text-right text-xs text-slate-400 mt-1 mb-4 shrink-0">
              {htmlCode.length} aksara
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 shrink-0">
              <div className="flex items-center text-yellow-800 font-medium mb-1">
                <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" /> Panduan Penggunaan
              </div>
              <p className="text-xs text-yellow-700 leading-relaxed">
                Tampal kod lengkap, tekan <span className="font-semibold italic">UJI KOD</span> untuk pratonton, kemudian tekan <span className="font-semibold italic">SUBMIT SOALAN INTERAKTIF</span>.
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-auto shrink-0">
              <button 
                onClick={handlePreview}
                className="w-full bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 py-3 rounded-lg font-bold flex items-center justify-center transition shadow-sm"
              >
                <Play className="w-5 h-5 mr-2" /> UJI KOD (Preview)
              </button>
              <button 
                onClick={() => {
                  if (!user) {
                    alert('Sila log masuk dahulu untuk submit soalan.');
                    return;
                  }
                  if (!htmlCode.trim()) {
                    alert('Sila masukkan kod HTML dahulu.');
                    return;
                  }
                  setIsSubmitModalOpen(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center transition shadow-sm"
              >
                <Save className="w-5 h-5 mr-2" /> SUBMIT SOALAN INTERAKTIF
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - PREVIEW */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] lg:min-h-0">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 gap-2 sm:gap-0">
            <div className="flex items-center text-slate-700 font-medium text-sm sm:text-base">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-amber-500" /> Paparan Soalan Interaktif (Live Preview)
            </div>
            
            <div className="flex items-center bg-white border border-slate-200 rounded-md p-1 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={`px-3 py-1.5 text-xs font-medium rounded flex items-center ${previewMode === 'desktop' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Monitor className="w-4 h-4 mr-1" /> Desktop
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={`px-3 py-1.5 text-xs font-medium rounded flex items-center ${previewMode === 'mobile' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Smartphone className="w-4 h-4 mr-1" /> Telefon
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button 
                onClick={() => setPreviewMode('fullscreen')}
                className={`px-3 py-1.5 text-xs font-medium rounded flex items-center text-emerald-600 hover:bg-emerald-50`}
              >
                <Maximize className="w-4 h-4 mr-1" /> Skrin Penuh
              </button>
            </div>
          </div>
          
          {previewHtml && (
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-slate-600">Mod Pratonton Aktif</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <span>↕️</span> Tinggi: <span className="font-mono text-blue-600 font-bold">{previewHeight}px</span>
                </span>
                <input 
                  type="range" 
                  min="300" 
                  max="2500" 
                  step="50"
                  value={previewHeight} 
                  onChange={(e) => {
                    setPreviewHeight(Number(e.target.value));
                    setAutoHeight(false);
                  }}
                  className="w-28 sm:w-36 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title="Seret untuk melaras tinggi soalan secara manual"
                />
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setAutoHeight(true);
                      const iframe = document.getElementById('interactive-preview-iframe') as HTMLIFrameElement;
                      if (iframe && iframe.contentWindow) {
                        try {
                          const doc = iframe.contentDocument || iframe.contentWindow.document;
                          if (doc && doc.body) {
                            const h = doc.body.scrollHeight || doc.documentElement.scrollHeight;
                            if (h > 0) setPreviewHeight(h + 40);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    className={`px-2 py-1 text-xs font-bold rounded transition border ${
                      autoHeight 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                    title="Sentiasa laras tinggi mengikut panjang soalan"
                  >
                    Auto-Fit
                  </button>
                  
                  <div className="w-px h-4 bg-slate-300"></div>
                  
                  <button
                    onClick={() => {
                      setAutoHeight(false);
                      setPreviewHeight(500);
                    }}
                    className="px-2 py-0.5 text-[10px] bg-white hover:bg-slate-50 text-slate-600 rounded border border-slate-200"
                  >
                    S (500)
                  </button>
                  <button
                    onClick={() => {
                      setAutoHeight(false);
                      setPreviewHeight(800);
                    }}
                    className="px-2 py-0.5 text-[10px] bg-white hover:bg-slate-50 text-slate-600 rounded border border-slate-200"
                  >
                    M (800)
                  </button>
                  <button
                    onClick={() => {
                      setAutoHeight(false);
                      setPreviewHeight(1200);
                    }}
                    className="px-2 py-0.5 text-[10px] bg-white hover:bg-slate-50 text-slate-600 rounded border border-slate-200"
                  >
                    L (1200)
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto relative">
            {!previewHtml ? (
              <div className="text-center text-slate-400">
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium text-slate-500 mb-1">Pratonton kod anda akan muncul di sini.</h3>
                <p className="text-sm">Tekan <span className="font-bold">UJI KOD</span> untuk bermula.</p>
              </div>
            ) : (
              <div 
                className={`bg-white shadow-lg border border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${
                  previewMode === 'mobile' ? 'w-[375px] h-[667px] rounded-[2rem] border-8 border-slate-800 overflow-hidden' : 
                  previewMode === 'fullscreen' ? 'absolute inset-0 w-full h-full rounded-none border-0 overflow-hidden' :
                  'w-full rounded-lg overflow-auto resize-y'
                }`}
                style={previewMode === 'desktop' ? { height: `${previewHeight}px`, minHeight: '300px' } : {}}
              >
                <iframe 
                  id="interactive-preview-iframe"
                  srcDoc={previewHtml}
                  title="Preview"
                  className="w-full flex-1 border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  onLoad={handleIframeLoad}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      )}

      {activeTab === 'bank' && (
        <main className="flex-1 p-4 sm:p-6 lg:h-[calc(100vh-76px)] overflow-y-auto lg:overflow-hidden bg-slate-50 flex flex-col pb-20 sm:pb-6">
          {!user ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-12 px-10 max-w-2xl text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Log Masuk Diperlukan</h2>
                <p className="text-slate-600 leading-relaxed text-[17px]">
                  Sila log masuk dengan akaun Google / DELIMa di bahagian<br/>atas kanan sistem terlebih dahulu untuk memuat turun dan<br/>menguruskan bank soalan dari Google Sheets.
                </p>
              </div>
            </div>
          ) : tokenExpired ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-12 px-10 max-w-2xl text-center">
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Sesi Google Tamat Tempoh</h2>
                <p className="text-slate-600 leading-relaxed text-[17px] mb-6">
                  Sesi Google anda telah tamat tempoh atau memerlukan pengesahan semula untuk mengakses Google Sheets & Google Classroom.
                </p>
                <button 
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center shadow-md transition"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sambung Sesi Google</span>
                </button>
              </div>
            </div>
          ) : isLoadingQuestions ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500 font-medium">Memuat turun data bank soalan...</div>
            </div>
          ) : (
            <BankSoalan 
              user={user} 
              questions={questions} 
              classes={classes} 
              token={token} 
              assignmentStatus={assignmentStatus}
              loadAssignmentStatus={loadAssignmentStatus}
              setAssignmentStatus={setAssignmentStatus}
              spreadsheetId={spreadsheetId}
              gasWebAppUrl={gasWebAppUrl}
              onEditQuestion={(q) => {
                setHtmlCode(q.html);
                setPreviewHtml(q.html);
                setFormData({
                  namaGuru: q.namaGuru || user.displayName || '',
                  tingkatan: q.tingkatan || '',
                  subjek: q.subjek || '',
                  bab: q.bab || '',
                  sp: q.sp || ''
                });
                setActiveTab('bina');
              }}
            />
          )}
        </main>
      )}

      {activeTab === 'semakan' && (
        <main className="flex-1 p-4 sm:p-6 lg:h-[calc(100vh-76px)] overflow-y-auto lg:overflow-hidden bg-slate-50 flex flex-col pb-20 sm:pb-6">
          {!user ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-12 px-10 max-w-2xl text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Log Masuk Diperlukan</h2>
                <p className="text-slate-600 leading-relaxed text-[17px]">
                  Sila log masuk dengan akaun Google / DELIMa di bahagian<br/>atas kanan sistem terlebih dahulu untuk memuat turun dan<br/>menyemak status pelajar dari Google Classroom.
                </p>
              </div>
            </div>
          ) : tokenExpired ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-12 px-10 max-w-2xl text-center">
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Sesi Google Tamat Tempoh</h2>
                <p className="text-slate-600 leading-relaxed text-[17px] mb-6">
                  Sesi Google anda telah tamat tempoh atau memerlukan pengesahan semula untuk mengakses Google Sheets & Google Classroom.
                </p>
                <button 
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center shadow-md transition"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sambung Sesi Google</span>
                </button>
              </div>
            </div>
          ) : (
            <SemakanGuru 
              user={user} 
              classes={classes} 
              token={token} 
              assignmentStatus={assignmentStatus}
              questions={questions}
              loadAssignmentStatus={loadAssignmentStatus}
              gasWebAppUrl={gasWebAppUrl}
              spreadsheetId={spreadsheetId}
            />
          )}
        </main>
      )}

      {/* FOOTER */}
      <footer className="hidden sm:block text-center py-2 text-xs text-slate-400">
        &copy; 2026 Sistem Pengujian & Penghantaran Soalan Interaktif SMKJ | CHAIREL ASHMAN
      </footer>

      {/* MOBILE TABS FOOTER */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#2a3441] p-2 flex justify-around border-t border-slate-600/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[40]">
        <button 
          onClick={() => handleTabChange('bina')}
          className={`flex-1 py-2 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center transition ${activeTab === 'bina' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
        >
          <span className="text-lg mb-1 leading-none">👩‍🏫</span>
          <span>BINA</span>
        </button>
        <button 
          onClick={() => handleTabChange('bank')}
          className={`flex-1 py-2 mx-1 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center transition ${activeTab === 'bank' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
        >
          <span className="text-lg mb-1 leading-none">📁</span>
          <span>TUGASAN</span>
        </button>
        <button 
          onClick={() => handleTabChange('semakan')}
          className={`flex-1 py-2 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center transition ${activeTab === 'semakan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}
        >
          <CheckCircle className={`w-5 h-5 mb-1 ${activeTab === 'semakan' ? 'text-white' : 'text-emerald-400'}`} />
          <span>SEMAKAN</span>
        </button>
      </div>

      {/* SUBMIT MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col relative">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-lg font-bold text-slate-800">Simpan Soalan</h2>
              <button 
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Guru</label>
                <input 
                  type="text" 
                  required
                  value={formData.namaGuru}
                  onChange={(e) => setFormData(prev => ({...prev, namaGuru: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600" 
                  readOnly
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tingkatan</label>
                  <ColorfulSelect 
                    value={formData.tingkatan}
                    onChange={(val) => setFormData(prev => ({...prev, tingkatan: val, bab: '', sp: ''}))}
                    options={[
                      {label: "Peralihan", value: "Peralihan"},
                      {label: "Tingkatan 1", value: "Tingkatan 1"},
                      {label: "Tingkatan 2", value: "Tingkatan 2"},
                      {label: "Tingkatan 3", value: "Tingkatan 3"},
                      {label: "Tingkatan 4", value: "Tingkatan 4"},
                      {label: "Tingkatan 5", value: "Tingkatan 5"}
                    ]}
                    placeholder="Pilih Tingkatan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subjek</label>
                  <ColorfulSelect 
                    value={formData.subjek}
                    onChange={(val) => setFormData(prev => ({...prev, subjek: val, bab: '', sp: ''}))}
                    options={SENARAI_SUBJEK.map(s => ({label: s, value: s}))}
                    placeholder="Pilih Subjek"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bab</label>
                <ColorfulSelect 
                  value={formData.bab}
                  onChange={(val) => setFormData(prev => ({...prev, bab: val, sp: ''}))}
                  options={getSenaraiBab(formData.tingkatan, formData.subjek).map(b => ({label: b, value: b}))}
                  placeholder="Pilih Bab"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Standard Pembelajaran (SP)</label>
                <div className="flex flex-col gap-2">
                  <div className="w-full flex flex-wrap items-center gap-2 px-3 py-2 border border-slate-300 rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white min-h-[42px]">
                    {formData.sp.split(',').map(s => s.trim()).filter(Boolean).map(sp => (
                      <span key={sp} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-md font-medium">
                        {sp}
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.sp.split(',').map(s => s.trim()).filter(Boolean);
                            setFormData(prev => ({...prev, sp: current.filter(s => s !== sp).join(', ')}))
                          }}
                          className="hover:bg-blue-200 text-blue-600 hover:text-blue-800 rounded-full p-0.5 ml-1 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      className="flex-1 outline-none min-w-[120px] text-sm bg-transparent"
                      placeholder={formData.sp ? "Tambah SP lagi (Tekan Enter)..." : "Contoh: 1.1.2, 1.1.3"}
                      required={!formData.sp}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim().replace(/,$/, '');
                          if (val) {
                            const current = formData.sp.split(',').map(s => s.trim()).filter(Boolean);
                            if (!current.includes(val)) {
                              setFormData(prev => ({...prev, sp: [...current, val].join(', ')}))
                            }
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.trim().replace(/,$/, '');
                        if (val) {
                          const current = formData.sp.split(',').map(s => s.trim()).filter(Boolean);
                          if (!current.includes(val)) {
                            setFormData(prev => ({...prev, sp: [...current, val].join(', ')}))
                          }
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  {formData.bab && (
                    <div className="flex flex-wrap gap-2 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-md max-h-40 overflow-y-auto">
                      <div className="w-full text-xs text-slate-500 mb-1 font-medium">Cadangan SP (Klik untuk tambah):</div>
                      {generateSPOptions(formData.bab).map(sp => {
                        const isSelected = formData.sp.split(',').map(s => s.trim()).includes(sp);
                        if (isSelected) return null;
                        return (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => {
                              const current = formData.sp.split(',').map(s => s.trim()).filter(Boolean);
                              setFormData(prev => ({...prev, sp: [...current, sp].join(', ')}))
                            }}
                            className="px-2 py-1 text-xs rounded-md border font-medium transition-colors bg-white text-slate-600 border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm"
                          >
                            + {sp}
                          </button>
                        );
                      })}
                      {generateSPOptions(formData.bab).every(sp => formData.sp.split(',').map(s => s.trim()).includes(sp)) && (
                        <div className="text-xs text-slate-400 italic">Semua cadangan SP telah dipilih.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md font-medium transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </span>
                  ) : 'Simpan Soalan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CONFIG MODAL */}
      {/* Gemini Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center">
                <span className="mr-2">💡</span>
                Tetapan Prompt Gemini
              </h3>
              <button onClick={() => setShowPromptModal(false)} className="text-white/80 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
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

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Muat Naik Video (Pilihan)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Muat naik video sebagai rujukan atau panduan bagi jawapan (seperti eksperimen), video ini akan diintegrasikan ke dalam soalan.
                  </p>
                  
                  {!driveFolderLink ? (
                    <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 italic">
                      Sila masukkan Pautan Folder Google Drive di ruangan Admin terlebih dahulu untuk menggunakan fungsi muat naik video.
                    </div>
                  ) : (
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
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-500" /> Pautan Video (YouTube / Link Luar)
                  </label>
                  <input
                    type="text"
                    placeholder="Tampal pautan video di sini..."
                    value={questionVideoLink}
                    onChange={(e) => setQuestionVideoLink(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 italic">Pautan ini akan disertakan dalam prompt untuk rujukan penjanaan soalan.</p>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowPromptModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleCopyPrompt}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center transition shadow-md"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Salin Prompt Gemini
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col relative max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-slate-800">Panel Pentadbiran (Admin)</h2>
              </div>
              <button 
                onClick={() => setIsAdminModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              {/* Google Sheets Link */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-blue-900 text-sm">Pangkalan Data Google Sheets</h3>
                  <p className="text-xs text-blue-700 mt-1">Buka helaian Google Spreadsheet utama untuk memantau senarai soalan, SP, dan markah murid secara langsung.</p>
                </div>
                <button
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition shrink-0 self-stretch md:self-auto text-center"
                >
                  Buka Spreadsheet ↗
                </button>
              </div>

              {/* Konfigurasi Sistem */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span>⚙️</span> Konfigurasi Pangkalan Data & Apps Script
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah konfigurasi di bawah untuk menggunakan Google Spreadsheet anda sendiri dan mengintegrasikan fungsi Apps Script.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">ID Google Spreadsheet</label>
                    <input 
                      type="text"
                      value={spreadsheetId}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setSpreadsheetId(val);
                        localStorage.setItem('smkj_spreadsheet_id', val);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan ID Spreadsheet anda..."
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Sila pastikan spreadsheet ini telah dikongsi (Shared) agar sistem boleh membaca data soalan.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">URL Web App Google Apps Script (gasWebAppUrl)</label>
                    <input 
                      type="text"
                      value={gasWebAppUrl}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setGasWebAppUrl(val);
                        localStorage.setItem('smkj_gas_web_app_url', val);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contoh: https://script.google.com/macros/s/.../exec"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">URL Web App Apps Script untuk fungsi simpanan langsung, gred automatik & integrasi Google Classroom.</p>
                  </div>
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
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={async () => {
                      if (token) {
                        try {
                          await loadData(token, spreadsheetId);
                          alert("Berjaya menyambung dan menyinkronkan data dari Spreadsheet baharu!");
                        } catch (err) {
                          alert("Gagal menyambung ke Spreadsheet baharu. Sila pastikan ID betul dan anda mempunyai akses.");
                        }
                      } else {
                        alert("Sila log masuk Google untuk memuatkan semula data.");
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-4 py-2 rounded-lg shadow-sm transition"
                  >
                    Uji & Sambung Database
                  </button>
                </div>
              </div>

              {/* Apps Script Guide */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                  <span>💻</span>
                  <h3>Penerapan Google Apps Script (Tanpa Sekatan Murid)</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold text-amber-600 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                  💡 Panduan Penting: Sila deploy/penerapan dengan konfigurasi di bawah supaya murid anda boleh menjawab kuiz secara langsung tanpa perlu melalui paparan sekatan / kebenaran akses (Authorization Required) daripada Google!
                </p>
                <ol className="text-xs text-slate-500 list-decimal pl-5 space-y-1.5">
                  <li>Di Google Spreadsheet anda, pergi ke menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Padamkan sebarang kod asal dan tampal kod Apps Script di bawah.</li>
                  <li>Tekan ikon <strong>Save (Disket)</strong> di bahagian atas editor.</li>
                  <li>Klik butang <strong>Deploy (Penerapan) &gt; New deployment (Penerapan baharu)</strong> di bahagian kanan atas skrin.</li>
                  <li>Pilih jenis deployment <strong>Web app</strong> (klik ikon gerigi sekiranya tiada jenis tersebut).</li>
                  <li>Setkan tetapan wajib berikut untuk keselamatan & kelancaran murid:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 font-medium text-slate-700 bg-slate-100 p-2 rounded border border-slate-200">
                      <li><strong className="text-blue-600">Execute as (Jalankan sebagai):</strong> <code>Me (e-mel anda)</code> (PENTING: supaya dijalankan dengan kredibiliti anda, jadi pelajar tidak memerlukan Authorization)</li>
                      <li><strong className="text-blue-600">Who has access (Siapa yang mempunyai akses):</strong> <code>Anyone (Sesiapa sahaja)</code> (PENTING: supaya murid boleh akses tanpa meminta kebenaran akaun)</li>
                    </ul>
                    <p className="text-[10px] text-emerald-600 mt-1 font-bold italic">Nota: Dengan tetapan ini, murid yang log masuk menggunakan e-mel peribadi (bukan DELIMa) atau tidak log masuk tetap boleh membuka pautan dan akan diminta untuk memasukkan nama dan e-mel mereka melalui paparan pop-up.</p>
                  </li>
                  <li>Klik butang <strong>Deploy</strong>. Berikan kelulusan kebenaran akaun anda (klik "Review Permissions", pilih akaun DELIMa anda, klik "Advanced", pilih "Go to Soalan Interaktif (unsafe)", dan klik "Allow").</li>
                  <li>Salin URL yang dijana di bawah tajuk <strong>Web app URL</strong>, tampalkan URL tersebut ke dalam kotak input "URL Web App Google Apps Script" di atas, dan klik <strong>Uji & Sambung Database</strong>.</li>
                  <li><strong>Bagaimana Sync Markah Berfungsi?</strong> Disebabkan Apps Script dijalankan sebagai "Me", jika guru lain menggunakan sistem ini untuk menyegerakan markah, dashboard React ini akan menyegerakan markah secara pintar terus dari pelayar web mereka menggunakan token aktif akaun login MOE mereka secara terus tanpa bergantung kepada skrip Apps Script lagi!</li>
                  <li><strong>Langkah Penting untuk Tab &apos;TUGASAN&apos; di Google Sheets:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <li>Buat satu tab/helaian baru bernama <strong className="text-blue-600 font-bold">TUGASAN</strong> dengan lajur-lajur berikut secara manual:
                        <div className="font-mono text-[10px] text-slate-500 mt-1 bg-white px-2 py-1 rounded border border-slate-100 font-bold">
                          A: KELAS, B: ID SOALAN, C: NAMA TUGASAN, D: KOD, E: NAMA GURU, F: LINK TUGASAN, G: COURSE ID, H: COURSEWORK ID
                        </div>
                      </li>
                      <li>Di sel <strong className="text-blue-600 font-bold">F1</strong> (tajuk lajur LINK TUGASAN), masukkan formula ARRAYFORMULA di bawah untuk menjana pautan soalan unik secara automatik (pastikan kod Web App di dalam formula di bawah adalah betul):
                        <textarea
                          readOnly
                          value={`={"LINK TUGASAN"; ARRAYFORMULA(IF(B2:B="", "", "${gasWebAppUrl || 'https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec'}?qid=" & B2:B & "&kelas=" & ENCODEURL(A2:A) & "&tugasan=" & ENCODEURL(C2:C) & "&kod=" & ENCODEURL(D2:D)))}`}
                          className="w-full mt-1.5 p-2 font-mono text-[10px] text-emerald-400 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:ring-0 select-all whitespace-pre-wrap leading-relaxed cursor-pointer"
                          rows={3}
                          onClick={(e) => {
                            (e.target as HTMLTextAreaElement).select();
                          }}
                        />
                      </li>
                    </ul>
                  </li>
                </ol>

                <div className="relative mt-2.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-900">
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-[10px] font-mono text-slate-400">Code.gs</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(appsScriptCode);
                        alert("Skrip Google Apps Script tersesuai telah disalin ke clipboard!");
                      }}
                      className="text-slate-300 hover:text-white text-xs flex items-center gap-1 bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded transition font-medium"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kod Terkini</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-60 leading-relaxed whitespace-pre font-mono">
                    {appsScriptCode}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-end shrink-0">
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
