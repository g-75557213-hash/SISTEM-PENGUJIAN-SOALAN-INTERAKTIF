import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Sparkles, Gamepad2, FlaskConical, Users, Copy, Check, Send, Radio, Zap, Trophy, Shield, RefreshCw, Layers, Eye, Save, ChevronLeft, MonitorPlay, Timer, Settings2, Download, Printer, Search, X, Youtube } from 'lucide-react';
import { GCClass, createAssignment } from '../lib/classroom';
import { SoalanData, SimulasiData, saveTugasanToSheets, readTugasanLink, updateTugasanStatus } from '../lib/sheets';

interface LiveGamificationStudioProps {
  userEmail?: string;
  userName?: string;
  classes: GCClass[];
  questions?: SoalanData[];
  simulasiList?: SimulasiData[];
  spreadsheetId?: string;
  gasWebAppUrl?: string;
  token?: string | null;
  onSaveToBank: (newQuestion: any) => Promise<void>;
  onSaveSimulasi: (newSim: any) => Promise<any>;
  onActiveSimulationChange?: (isActive: boolean) => void;
}

export default function LiveGamificationStudio({ 
  userEmail, 
  userName, 
  classes, 
  questions = [], 
  simulasiList = [], 
  spreadsheetId,
  gasWebAppUrl,
  token,
  onSaveToBank, 
  onSaveSimulasi, 
  onActiveSimulationChange 
}: LiveGamificationStudioProps) {
  const playSound = (type: 'click' | 'join' | 'success' | 'drop' | 'fizz' | 'tick') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'join') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'click') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'drop') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {}
  };

  const [category, setCategory] = useState<'cipta' | 'simulation'>('cipta');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    if (onActiveSimulationChange) {
      onActiveSimulationChange(!!selectedApp);
    }
  }, [selectedApp, onActiveSimulationChange]);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const toggleFullscreen = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };
  
  // -- SIMULATION SELECTION STATE --
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendSim, setSendSim] = useState<any>(null);
  const [sendForm, setSendForm] = useState({
    title: '',
    description: '',
    points: 100,
    courseIds: [] as string[]
  });
  const [loadingMulti, setLoadingMulti] = useState(false);

  const openSendModal = (sim: any) => {
    setSendSim(sim);
    setSendForm({
      title: `Simulasi: ${sim.title}`,
      description: `Sila jalankan simulasi amali ini. Ikuti prosedur yang diberikan.\n\nArahan:\n1. Klik pautan di bawah.\n2. Jalankan simulasi amali.\n3. Cetak / Simpan laporan jika perlu.`,
      points: 100,
      courseIds: []
    });
    setShowSendModal(true);
  };

  const handleSendToGCMulti = async () => {
    if (!token || !sendSim || sendForm.courseIds.length === 0) {
      alert('Sila log masuk ke Google Classroom dan pilih sekurang-kurangnya satu kelas.');
      return;
    }
    
    setLoadingMulti(true);
    try {
      const realSim = simulasiList.find(s => s.bab === sendSim.title);
      const sid = realSim ? realSim.idSimulasi : sendSim.id;
      const baseLinkFromSheet = realSim?.linkSimulasi;

      for (const courseId of sendForm.courseIds) {
        const matchedClass = classes.find(c => c.id === courseId);
        const className = matchedClass ? matchedClass.name : courseId;
        
        let linkToUse = '';
        const savedData = await saveTugasanToSheets(
          token,
          spreadsheetId || '',
          className,
          sid || '',
          sendForm.title,
          userName || userEmail || 'Guru'
        );
        
        if (savedData) {
          const { rowNum, uniqueCode } = savedData;
          
          if (baseLinkFromSheet) {
            // Priority: Use the link from Column H of SIMULASI
            const separator = baseLinkFromSheet.includes('?') ? '&' : '?';
            linkToUse = `${baseLinkFromSheet}${separator}kelas=${encodeURIComponent(className)}&tugasan=${encodeURIComponent(sendForm.title)}&kod=${uniqueCode}`;
          } else {
            // Fallback: Generate link manually
            const finalGasUrl = gasWebAppUrl || "https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec";
            linkToUse = `${finalGasUrl}?sid=${sid}&kelas=${encodeURIComponent(className)}&tugasan=${encodeURIComponent(sendForm.title)}&kod=${uniqueCode}`;
          }

          // Post to Classroom
          const assignment = await createAssignment(token, courseId, sendForm.title, sendForm.description, linkToUse, { maxPoints: sendForm.points });
          
          // Update the "TUGASAN" sheet with status and link
          await updateTugasanStatus(token, spreadsheetId || '', rowNum, "Telah Di-Post", courseId, assignment.id);
          
          // Also write the specific link used to Column F (index 6, but sheets is 1-indexed so it's 6)
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!F${rowNum}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[linkToUse]] })
          });
        }
      }
      alert('Simulasi berjaya dihantar ke kelas yang dipilih!');
      setShowSendModal(false);
    } catch (err: any) {
      console.error(err);
      alert('Ralat semasa menghantar simulasi: ' + err.message);
    } finally {
      setLoadingMulti(false);
    }
  };

  const [activeForm, setActiveForm] = useState<string>('Tingkatan 1');
  const [customHTML, setCustomHTML] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [simForm, setSimForm] = useState({ tingkatan: 'Tingkatan 1', tajuk: '', namaGuru: userName || userEmail || '' });
  const [isSaving, setIsSaving] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- T1 Simulation State (Ketumpatan) ---
  type T1DroppedObj = { id: string, name: string, density: number, type: 'gabus' | 'besi' | 'minyak' | 'custom', offsetX: number, color?: string };
  const liquidOptions = [
    {id: 'air', name: 'Air', density: 1.0, color: 'bg-blue-500/30', border: 'border-blue-400/80', textColor: 'text-blue-300/80', tagColor: 'bg-blue-900/50'},
    {id: 'minyak', name: 'Minyak', density: 0.9, color: 'bg-yellow-500/40', border: 'border-yellow-400/80', textColor: 'text-yellow-300/80', tagColor: 'bg-yellow-900/50'},
    {id: 'madu', name: 'Madu', density: 1.4, color: 'bg-amber-600/50', border: 'border-amber-500/80', textColor: 'text-amber-300/80', tagColor: 'bg-amber-900/50'},
    {id: 'alkohol', name: 'Alkohol', density: 0.79, color: 'bg-cyan-400/20', border: 'border-cyan-300/80', textColor: 'text-cyan-200/80', tagColor: 'bg-cyan-900/50'}
  ];
  const [baseLiquidId, setBaseLiquidId] = useState<string>('air');
  const baseLiquid = liquidOptions.find(l => l.id === baseLiquidId) || liquidOptions[0];
  const [t1Dropped, setT1Dropped] = useState<T1DroppedObj[]>([]);
  const [customDensity, setCustomDensity] = useState<number>(1.5);
  const [customName, setCustomName] = useState<string>('Bahan Baru');

  const handleDropItem = (name: string, type: 'gabus' | 'besi' | 'minyak' | 'custom', density: number) => {
    playSound('drop');
    const newItem: T1DroppedObj = { 
      id: String(Date.now()) + Math.random().toString(), 
      name, type, density, 
      offsetX: Math.random() * 100 - 50,
      color: type === 'custom' ? `hsl(${Math.random() * 360}, 70%, 50%)` : undefined 
    };
    setT1Dropped(prev => [...prev, newItem]);
  };
  const resetT1 = () => { playSound('click'); setT1Dropped([]); };

  // --- T2 Simulation State (Bandul Ringkas) ---
  const [t2Length, setT2Length] = useState<number>(50);
  const [t2Mass, setT2Mass] = useState<number>(50);
  const [t2Gravity, setT2Gravity] = useState<number>(9.81);
  const [t2IsRunning, setT2IsRunning] = useState(false);
  const [t2Angle, setT2Angle] = useState(-30 * (Math.PI / 180));
  const t2ReqRef = useRef<number>();
  const t2StartTime = useRef<number>(0);
  const t2MaxAngle = 30 * (Math.PI / 180);
  const [t2Results, setT2Results] = useState<{ length: number, mass: number, gravity: number, time10: number, period: number }[]>([]);
  const [t2TimeStr, setT2TimeStr] = useState<string>('0.00');
  const [t2OscCount, setT2OscCount] = useState<number>(0);
  const lastT2UpdateRef = useRef<number>(0);
  const t2Period = 2 * Math.PI * Math.sqrt((t2Length / 100) / t2Gravity);

  const toggleT2 = () => {
    playSound('click');
    if (t2IsRunning) {
      cancelAnimationFrame(t2ReqRef.current!);
      setT2IsRunning(false); setT2Angle(-t2MaxAngle); setT2TimeStr('0.00'); setT2OscCount(0);
    } else {
      t2StartTime.current = performance.now(); lastT2UpdateRef.current = 0; setT2IsRunning(true); setT2Angle(-t2MaxAngle); setT2TimeStr('0.00'); setT2OscCount(0);
      const animate = (time: number) => {
        const elapsed = (time - t2StartTime.current) / 1000;
        const currentAngle = -t2MaxAngle * Math.cos((2 * Math.PI / t2Period) * elapsed);
        setT2Angle(currentAngle);
        if (time - lastT2UpdateRef.current > 100) {
           setT2TimeStr(elapsed.toFixed(2)); setT2OscCount(Math.min(10, Math.floor(elapsed / t2Period)));
           lastT2UpdateRef.current = time;
        }
        if (elapsed >= 10 * t2Period) {
           setT2IsRunning(false); setT2Angle(-t2MaxAngle); setT2TimeStr((10 * t2Period).toFixed(2)); setT2OscCount(10); playSound('success');
           setT2Results(prev => [...prev, { length: t2Length, mass: t2Mass, gravity: t2Gravity, time10: 10 * t2Period, period: t2Period }]);
           return;
        }
        t2ReqRef.current = requestAnimationFrame(animate);
      };
      t2ReqRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (t2IsRunning) { toggleT2(); toggleT2(); }
    return () => cancelAnimationFrame(t2ReqRef.current!);
  }, [t2Length, t2Gravity]);

  const allSimulations: Record<string, any[]> = {
    'Tingkatan 1': [ { id: 'sim_ketumpatan', title: 'Ketumpatan (Demo)', icon: <Layers className="w-6 h-6 text-blue-400" />, desc: 'Mengkaji ketumpatan pepejal/cecair' } ],
    'Tingkatan 2': [ { id: 'sim_bandul', title: 'Bandul Ringkas (Demo)', icon: <Timer className="w-6 h-6 text-fuchsia-400" />, desc: 'Simulasi interaktif bandul Lovable' } ],
    'Tingkatan 3': [], 'Tingkatan 4': [], 'Tingkatan 5': []
  };
  
  if (simulasiList && simulasiList.length > 0) {
    simulasiList.forEach((sim, idx) => {
      const form = sim.tingkatan || 'Tingkatan 1';
      if (!allSimulations[form]) allSimulations[form] = [];
      allSimulations[form].push({ id: `sim_db_${idx}`, title: sim.bab, icon: <FlaskConical className="w-6 h-6 text-cyan-400" />, desc: `Ciptaan: ${sim.namaGuru}`, html: sim.html });
    });
    Object.keys(allSimulations).forEach(form => allSimulations[form].sort((a, b) => a.title.localeCompare(b.title)));
  }

  const handleSaveSimulasi = async () => {
    if (!customHTML.trim() || !simForm.tajuk.trim()) {
      alert('Sila masukkan tajuk dan kod simulasi'); return;
    }
    setIsSaving(true);
    try {
      const newSim = { idSoalan: 'SIM-' + Date.now(), namaGuru: simForm.namaGuru || 'Guru', tingkatan: simForm.tingkatan, subjek: 'Sains', bab: simForm.tajuk, sp: 'Simulasi Eksperimen', html: customHTML };
      const res = await onSaveSimulasi(newSim);
      if (res && res.linkSimulasi) alert(`Simulasi berjaya disimpan!\n\nID: ${res.idSimulasi}\nLink: ${res.linkSimulasi}`);
      else alert('Simulasi berjaya disimpan!');
      setCustomHTML(''); setPreviewHTML(''); setSimForm({ tingkatan: 'Tingkatan 1', tajuk: '', namaGuru: simForm.namaGuru });
    } catch (err: any) {
      alert('Gagal menyimpan simulasi: ' + (err.message || 'Sila pastikan tab bernama SIMULASI wujud.'));
    }
    setIsSaving(false);
  };

  const renderCiptaSimulasi = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 space-y-6">
          <h2 className="text-xl font-bold text-cyan-300 border-b border-slate-800 pb-3">Bina Simulasi AI (Gemini)</h2>
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-3 text-sm text-slate-300">
              <p>Gunakan Gemini untuk menukar gambar / prosedur eksperimen fizikal kepada aplikasi simulasi interaktif.</p>
              <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-2">
                <li>Buka <a href="https://gemini.google.com" target="_blank" className="text-blue-400 hover:underline">gemini.google.com</a></li>
                <li>Muat naik gambar eksperimen</li>
                <li>Salin prompt di sebelah dan tampal ke Gemini</li>
                <li>Salin kod HTML yang dijana dan tampal di bawah</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col relative">
          <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl shadow-inner">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-red-500" /> Pautan Video (YouTube / Link Luar)
            </label>
            <input
              type="text"
              placeholder="Tampal pautan video di sini untuk disertakan dalam prompt..."
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-500 mt-2 ml-1 italic">Prompt akan automatik menyertakan arahan untuk menjana video pengenalan jika pautan diisi.</p>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400"/> Prompt AI</h3>
            <button onClick={() => {
              const videoInstruction = videoLink ? `\n12. Video: Gunakan pautan video ini [${videoLink}] untuk memaparkan video penerangan atau simulasi visual sebagai pengenalan di bahagian atas atau sisi aplikasi sebelum pelajar mula berinteraksi.` : "";
              const promptText = `Bertindak sebagai Pakar Pembangun Simulasi Pendidikan (Game-Based Learning). Berdasarkan gambar eksperimen yang saya berikan, sila cipta satu aplikasi simulasi interaktif yang SANGAT CANGGIH, ESTETIK, DAN FUNGSIONAL menggunakan HTML, Tailwind CSS, dan JavaScript tulen dalam SATU fail HTML lengkap.

Keperluan Kualiti Tinggi (ANTI-SLOP):
1. Reka Bentuk Visual: Gunakan UI moden (Sleek/Glassmorphism). Elakkan warna biru/ungu generik AI. Gunakan palet warna profesional (cth: Slate, Emerald, Rose).
2. Animasi & Transisi Penuh (Full Animation): Gabungkan CSS \`@keyframes\` dan JavaScript \`requestAnimationFrame\` untuk mencipta simulasi yang benar-benar hidup dan bernyawa. Pastikan setiap pergerakan objek mempunyai transisi yang lancar (smooth transitions/easing). Gunakan CSS animations untuk kesan 'living' (cth: air beralun, gas berbuih).
3. Gamifikasi: Sertakan elemen interaktif seperti 'Score', 'Level Progress', atau 'Badges' apabila pelajar berjaya melengkapkan amali dengan betul.
4. Maklum Balas Visual & Interaksi: Berikan kesan visual (seperti glow atau perubahan warna) apabila radas diletakkan di tempat yang betul (Drag & Drop), dan apabila berinteraksi (hover/active).
5. Audio & Kesan Bunyi (Web Audio API): WAJIB gunakan Web Audio API untuk mensintesis muzik latar (synthesia) yang sedap didengar, menenangkan (lo-fi/ambient), dan berulang (loop) dengan kelantangan yang perlahan. Hasilkan melodi sintesis menggunakan oscillator. Sertakan juga bunyi Sfx apabila tindakan berjaya. Sediakan butang Mute/Unmute. JANGAN gunakan link audio luar!
6. Logik Saintifik Realistik: Pastikan formula sains (cth: ρ = m/V, T = 2π√(l/g)) adalah tepat dan simulasi bertindak balas mengikut input pemboleh ubah secara 'real-time'.
7. Radas & Prosedur: Paparkan senarai radas dengan ikon yang cantik dan prosedur yang jelas.
8. Jadual Pemerhatian: Data mesti dikemas kini secara dinamik ke dalam jadual apabila amali dijalankan.
9. Laporan Amali (CIRI UTAMA): Sediakan butang 'Jana Laporan'. Apabila ditekan, paparkan Modal Overlay yang menunjukkan Laporan Amali Penuh (Tujuan, Hipotesis, Radas, Prosedur, Keputusan, Perbincangan, Kesimpulan).
10. Tatabahasa: Bahagian PROSEDUR di dalam laporan WAJIB menggunakan AYAT PASIF (cth: 'Bikar diisi...' bukannya 'Isi bikar...').${videoInstruction}

Fail HTML ini mestilah 'self-contained', responsif, dan mempunyai 'User Experience' (UX) yang sangat baik seperti aplikasi premium.`;
              navigator.clipboard.writeText(promptText); alert('Prompt disalin!');
            }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors">Salin Prompt</button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[150px]">
            Cipta simulasi sains interaktif (HTML/Tailwind/JS). Sertakan radas, prosedur, logik saintifik, drag-and-drop, animasi, dan jadual. Gantikan butang cetak dengan butang 'Laporan' yang memaparkan preview laporan penuh dengan ayat pasif pada prosedur serta butang muat turun.
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2 space-y-4">
          <h3 className="text-lg font-bold text-slate-200">Uji & Simpan Simulasi</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Tingkatan</label>
                <select value={simForm.tingkatan} onChange={e => setSimForm({...simForm, tingkatan: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none">
                  {['Tingkatan 1','Tingkatan 2','Tingkatan 3','Tingkatan 4','Tingkatan 5'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Tajuk Eksperimen</label>
                <input type="text" value={simForm.tajuk} onChange={e => setSimForm({...simForm, tajuk: e.target.value})} placeholder="Cth: Ketumpatan Air" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"/>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nama Guru</label>
              <input type="text" value={simForm.namaGuru} onChange={e => setSimForm({...simForm, namaGuru: e.target.value})} placeholder="Nama Guru" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block flex justify-between">
                <span>Tampal Kod HTML</span>
                {customHTML ? (
                  <button onClick={() => setCustomHTML('')} className="text-red-400 hover:text-red-300 transition-colors font-bold uppercase text-[10px]">Padam Kod</button>
                ) : (
                  <button onClick={async () => setCustomHTML(await navigator.clipboard.readText())} className="text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase text-[10px]">Tampal Kod</button>
                )}
              </label>
              <textarea value={customHTML} onChange={e => setCustomHTML(e.target.value)} placeholder="<!DOCTYPE html>..." className="w-full h-[300px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-emerald-400 font-mono text-xs outline-none focus:border-cyan-500 custom-scrollbar"/>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setPreviewHTML(customHTML)} disabled={!customHTML.trim()} className="w-1/2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"><MonitorPlay className="w-4 h-4"/> Uji</button>
              <button onClick={handleSaveSimulasi} disabled={isSaving || !customHTML.trim() || !simForm.tajuk.trim()} className="w-1/2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">{isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Simpan</button>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col">
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400"/> Pratonton</h3>
          <div className="flex-1 bg-white rounded-xl border-4 border-slate-800 overflow-hidden relative min-h-[600px]">
            {!previewHTML.trim() ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                <MonitorPlay className="w-12 h-12 mb-2 opacity-50"/><p className="text-sm font-medium">Klik "Uji" untuk papar</p>
              </div>
            ) : (
              <iframe ref={iframeRef} srcDoc={previewHTML} className="w-[200%] h-[200%] origin-top-left scale-50 border-0" title="Preview" sandbox="allow-scripts allow-same-origin"/>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />

      {selectedApp === null ? (
        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          <div className="text-center pt-4"><h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 tracking-tight">Cipta Simulasi & Eksperimen KSSM</h1></div>
          <div className="flex justify-center mb-8">
            <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-2">
              <button onClick={() => setCategory('cipta')} className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${category === 'cipta' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-slate-400'}`}><MonitorPlay className="w-5 h-5" /> Cipta</button>
              <button onClick={() => setCategory('simulation')} className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${category === 'simulation' ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' : 'text-slate-400'}`}><FlaskConical className="w-5 h-5" /> Koleksi</button>
            </div>
          </div>

          {category === 'simulation' ? (
            <>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {Object.keys(allSimulations).map(form => (
                  <button key={form} onClick={() => setActiveForm(form)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${activeForm === form ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{form}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allSimulations[activeForm].length > 0 ? allSimulations[activeForm].map(c => (
                  <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
                    <div className="w-full h-32 relative bg-white border-b border-slate-800">
                       {c.html ? <iframe srcDoc={c.html} className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none" title="preview" sandbox="allow-scripts"/> : <div className="w-full h-full flex items-center justify-center">{c.icon}</div>}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-white mb-1">{c.title}</h3>
                      <p className="text-sm text-slate-400 mb-4 flex-1">{c.desc}</p>
                      <div className="flex gap-2">
                         <button onClick={() => setSelectedApp(c.id)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Pratonton</button>
                         {(c.id.startsWith('sim_db_') || c.id === 'sim_ketumpatan' || c.id === 'sim_bandul') && <button onClick={() => openSendModal(c)} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"><Send className="w-3.5 h-3.5" /> Classroom</button>}
                      </div>
                    </div>
                  </div>
                )) : <div className="col-span-full py-12 text-center text-slate-500">Tiada simulasi tersedia.</div>}
              </div>
            </>
          ) : renderCiptaSimulasi()}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6 relative z-10 h-[calc(100vh-120px)]">
           {selectedApp.startsWith('sim_db_') ? (
             <div className="flex flex-col gap-6 w-full h-full">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                  <button onClick={() => toggleFullscreen('sim-db-container')} className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-cyan-300 font-bold text-sm shadow-lg flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Skrin Penuh</button>
                </div>
                <div id="sim-db-container" className="flex-1 bg-white rounded-2xl border-4 border-slate-800 overflow-hidden relative shadow-2xl">
                   {isFullscreen && <button onClick={() => toggleFullscreen('sim-db-container')} className="absolute top-4 right-4 z-50 bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold">✕ Tutup</button>}
                   {(() => {
                     const simIdx = parseInt(selectedApp.replace('sim_db_', ''));
                     const simData = simulasiList?.[simIdx];
                     return simData ? <iframe srcDoc={simData.html} className="w-full h-full border-0" title={simData.bab} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"/> : null;
                   })()}
                </div>
             </div>
           ) : selectedApp === 'sim_bandul' ? (
             <div className="flex flex-col gap-6 w-full">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8">
                   <div className="w-full md:w-1/3 space-y-6">
                      <button onClick={() => { setSelectedApp(null); setT2IsRunning(false); }} className="text-slate-400 flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                      <h2 className="text-xl font-bold text-fuchsia-300">Bandul Ringkas</h2>
                      <div className="space-y-6">
                         <div className="space-y-2"><div className="flex justify-between text-sm text-slate-300"><label>Panjang (cm)</label><span>{t2Length}</span></div><input type="range" min="10" max="100" value={t2Length} onChange={e => setT2Length(Number(e.target.value))} className="w-full" disabled={t2IsRunning} /></div>
                         <div className="space-y-2"><div className="flex justify-between text-sm text-slate-300"><label>Graviti</label><span>{t2Gravity.toFixed(2)}</span></div><select disabled={t2IsRunning} value={t2Gravity} onChange={e => setT2Gravity(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"><option value={9.81}>Bumi (9.81)</option><option value={1.62}>Bulan (1.62)</option></select></div>
                         <button onClick={toggleT2} className={`w-full py-3 ${t2IsRunning ? 'bg-red-600' : 'bg-fuchsia-600'} text-white font-bold rounded-xl shadow-lg`}>{t2IsRunning ? 'Berhenti' : 'Mula'}</button>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><div className="text-[10px] text-slate-500 uppercase mb-1">Masa (s)</div><div className="text-2xl font-mono text-fuchsia-400 font-bold">{t2TimeStr}</div></div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><div className="text-[10px] text-slate-500 uppercase mb-1">Ayunan</div><div className="text-2xl font-mono text-emerald-400 font-bold">{t2OscCount}/10</div></div>
                         </div>
                      </div>
                   </div>
                   <div className="w-full md:w-2/3 bg-slate-950 rounded-xl flex items-center justify-center relative overflow-hidden h-[500px]">
                      <div className="absolute top-11 left-1/2" style={{ transform: `rotate(${t2Angle}rad)`, transformOrigin: 'top center', height: `${t2Length * 3}px` }}><div className="w-0.5 h-full bg-slate-300 mx-auto" /><div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-pink-500 w-8 h-8" /></div>
                   </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8"><h3 className="text-lg font-bold text-white mb-4">Keputusan</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left text-slate-300 border border-slate-700"><thead className="bg-slate-800"><tr><th className="px-4 py-3 border border-slate-700">Set</th><th className="px-4 py-3 border border-slate-700">Panjang (cm)</th><th className="px-4 py-3 border border-slate-700">Masa 10 Ayunan (s)</th></tr></thead><tbody>{t2Results.map((r, i) => <tr key={i}><td className="px-4 py-2 border border-slate-700">{i+1}</td><td className="px-4 py-2 border border-slate-700">{r.length}</td><td className="px-4 py-2 border border-slate-700">{r.time10.toFixed(2)}</td></tr>)}</tbody></table></div></div>
             </div>
           ) : selectedApp === 'sim_ketumpatan' ? (
             <div className="flex flex-col gap-6 w-full">
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 min-h-[500px]">
                <div className="w-full md:w-1/3 space-y-6">
                   <button onClick={() => setSelectedApp(null)} className="text-slate-400 flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Kembali</button>
                   <h2 className="text-xl font-bold text-blue-300">Ketumpatan (T1)</h2>
                   <div className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"><label className="text-sm font-bold text-slate-300">Cecair:</label><select value={baseLiquidId} onChange={e => setBaseLiquidId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm">{liquidOptions.map(l => <option key={l.id} value={l.id}>{l.name} ({l.density})</option>)}</select></div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"><label className="text-sm font-bold text-slate-300">Bahan:</label><div className="flex flex-wrap gap-2"><button onClick={() => handleDropItem('Gabus', 'gabus', 0.24)} className="flex-1 py-2 rounded-lg bg-orange-700 text-white text-sm">Gabus</button><button onClick={() => handleDropItem('Besi', 'besi', 7.87)} className="flex-1 py-2 rounded-lg bg-slate-600 text-white text-sm">Besi</button></div></div>
                   </div>
                </div>
                <div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex items-center justify-center relative overflow-hidden h-[500px]">
                   <div className="relative w-64 h-80 border-4 border-t-0 border-blue-900 rounded-b-3xl bg-slate-900 overflow-hidden flex flex-col justify-end shadow-2xl">
                      <div className={`absolute top-[40%] w-full h-[60%] border-t-2 ${baseLiquid.color} ${baseLiquid.border}`} />
                      {t1Dropped.map((obj) => (
                        <div key={obj.id} className="absolute z-20 flex flex-col items-center" style={{ top: obj.density < baseLiquid.density ? '150px' : '280px', left: `calc(50% + ${obj.offsetX}px)`, transform: 'translateX(-50%)' }}>
                          <div className="text-[10px] text-white bg-black/50 px-1 rounded mb-1">{obj.name}</div>
                          {obj.type === 'gabus' ? <div className="w-12 h-8 bg-orange-700 rounded" /> : <div className="w-10 h-10 bg-slate-500 rounded" />}
                        </div>
                      ))}
                   </div>
                </div>
               </div>
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8"><h3 className="text-lg font-bold text-white mb-4">Keputusan</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left text-slate-300 border border-slate-700"><thead><tr><th className="px-4 py-3 border border-slate-700">Set</th><th className="px-4 py-3 border border-slate-700">Bahan</th><th className="px-4 py-3 border border-slate-700">Keputusan</th></tr></thead><tbody>{t1Dropped.map((r, i) => <tr key={r.id}><td className="px-4 py-2 border border-slate-700">{i+1}</td><td className="px-4 py-2 border border-slate-700">{r.name}</td><td className="px-4 py-2 border border-slate-700">{r.density > baseLiquid.density ? 'Tenggelam' : 'Terapung'}</td></tr>)}</tbody></table></div></div>
             </div>
           ) : null}
        </div>
      )}

      {showSendModal && sendSim && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-800">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between shrink-0"><h3 className="text-white font-bold text-lg flex items-center"><Send className="w-5 h-5 mr-2" /> Hantar ke Google Classroom</h3><button onClick={() => setShowSendModal(false)} className="text-white hover:text-white transition"><X className="w-6 h-6" /></button></div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-slate-900">
              <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Tajuk Tugasan</label><input type="text" value={sendForm.title} onChange={e => setSendForm(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"/></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Arahan</label><textarea rows={4} value={sendForm.description} onChange={e => setSendForm(prev => ({ ...prev, description: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Pilih Kelas</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">{classes.map(c => (<label key={c.id} className={`flex items-center p-3 border rounded-xl transition ${sendForm.courseIds.includes(c.id) ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700 cursor-pointer'}`}><input type="checkbox" checked={sendForm.courseIds.includes(c.id)} onChange={(e) => setSendForm(prev => ({ ...prev, courseIds: e.target.checked ? [...prev.courseIds, c.id] : prev.courseIds.filter(id => id !== c.id) }))} className="w-4 h-4 text-purple-600 border-slate-800 rounded focus:ring-purple-500 bg-slate-900" /><span className="ml-3 text-sm font-medium text-slate-200 line-clamp-1 flex-1">{c.name}</span></label>))}</div></div>
            </div>
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-end gap-3 shrink-0"><button onClick={() => setShowSendModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white">Batal</button><button onClick={handleSendToGCMulti} disabled={loadingMulti || sendForm.courseIds.length === 0} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center transition shadow-lg">{loadingMulti ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Hantar Tugasan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
