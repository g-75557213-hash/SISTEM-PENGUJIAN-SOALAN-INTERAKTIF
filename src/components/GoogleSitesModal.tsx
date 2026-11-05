import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Code2, Link2, Monitor, Smartphone, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { SoalanData, saveTugasanUmumRowToSheet } from '../lib/sheets';

interface GoogleSitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: SoalanData | null;
  classes?: any[];
  token: string | null;
  spreadsheetId?: string;
  user?: any;
}

export default function GoogleSitesModal({
  isOpen,
  onClose,
  question,
  classes = [],
  token,
  spreadsheetId,
  user
}: GoogleSitesModalProps) {
  const [kelasInput, setKelasInput] = useState('');
  const [kodTugasan, setKodTugasan] = useState('');
  const [activeTab, setActiveTab] = useState<'embed' | 'url' | 'guide'>('embed');
  const [frameHeight, setFrameHeight] = useState('680');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSavedToSystem, setIsSavedToSystem] = useState(false);

  useEffect(() => {
    if (isOpen && question) {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      setKodTugasan(`GS-${randomSuffix}`);
      setKelasInput('');
      setCopiedEmbed(false);
      setCopiedUrl(false);
      setIsSavedToSystem(false);
    }
  }, [isOpen, question]);

  if (!isOpen || !question) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const finalKelas = kelasInput.trim() || 'SEMUA KELAS';
  const finalKod = kodTugasan.trim().toUpperCase() || 'GS-SITES';

  // URL khusus untuk Google Sites dengan penapis embed=sites
  const sitesEmbedUrl = `${origin}/?qid=${encodeURIComponent(question.idSoalan)}&kod=${encodeURIComponent(finalKod)}&kelas=${encodeURIComponent(finalKelas)}&mod=umum&embed=sites`;

  // Kod HTML Embed responsif sedia tampal ke Google Sites
  const embedCodeSnippet = `<div style="position:relative;width:100%;height:${frameHeight}px;overflow:hidden;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.08);border:1px solid #e2e8f0;background:#ffffff;">
  <iframe 
    src="${sitesEmbedUrl}" 
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" 
    allow="fullscreen; autoplay" 
    loading="lazy"
    title="${question.bab || question.idSoalan}">
  </iframe>
</div>`;

  // Simpan pautan ini ke tab TUGASAN UMUM dan pelayan
  const handleEnsureSaved = async () => {
    if (isSavedToSystem) return;
    try {
      // 1. Simpan ke local storage
      const stored = localStorage.getItem('sistem_tugasan_umum_list');
      const list = stored ? JSON.parse(stored) : [];
      const newRec = {
        kod: finalKod,
        qid: question.idSoalan,
        kelas: finalKelas,
        link: sitesEmbedUrl,
        soalanTajuk: question.bab || question.idSoalan,
        subjek: question.subjek || '',
        tingkatan: question.tingkatan || '',
        bab: question.bab || '',
        namaGuru: user?.displayName || user?.email || '',
        source: 'Google Sites',
        createdAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
      };
      localStorage.setItem('sistem_tugasan_umum_list', JSON.stringify([newRec, ...list.filter((x: any) => x.kod !== finalKod)]));

      // 2. Simpan ke pelayan
      fetch('/api/tugasan-umum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kod: finalKod,
          qid: question.idSoalan,
          soalanTajuk: question.bab || question.idSoalan,
          tingkatan: question.tingkatan || '',
          subjek: question.subjek || '',
          bab: question.bab || '',
          kelas: finalKelas,
          guruEmail: user?.email || '',
          guruNama: user?.displayName || ''
        })
      }).catch(() => {});

      // 3. Simpan ke tab TUGASAN UMUM Google Sheets
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null);
      const activeSheetId = spreadsheetId || (typeof window !== 'undefined' ? localStorage.getItem('smkj_spreadsheet_id') : null) || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';

      if (activeToken && activeSheetId) {
        saveTugasanUmumRowToSheet(activeToken, activeSheetId, {
          kod: finalKod,
          qid: question.idSoalan,
          kelas: finalKelas,
          link: sitesEmbedUrl,
          namaGuru: user?.displayName || user?.email || ''
        }).catch(() => {});
      }

      setIsSavedToSystem(true);
    } catch (err) {
      console.warn("Ralat merekod pautan Google Sites:", err);
    }
  };

  const copyEmbedCode = () => {
    handleEnsureSaved();
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const copySitesUrl = () => {
    handleEnsureSaved();
    navigator.clipboard.writeText(sitesEmbedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
              🌐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Integrasi Google Sites</h2>
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/30 uppercase tracking-wider">
                  Embed Ready
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Sematkan soalan interaktif ini terus ke dalam laman web Google Sites anda
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Question Summary Banner */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono text-[11px] font-black">
                  {question.idSoalan}
                </span>
                <span>•</span>
                <span>{question.tingkatan || 'KSSM'}</span>
                <span>•</span>
                <span>{question.subjek}</span>
              </div>
              <div className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                {question.bab || question.idSoalan}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Auto-Sync Markah Murid
              </span>
            </div>
          </div>

          {/* Configuration Form: Kelas & Kod */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Kelas / Kumpulan Sasaran
              </label>
              <input 
                type="text" 
                value={kelasInput}
                onChange={(e) => setKelasInput(e.target.value)}
                placeholder="Cth: 4 IBNU SINA atau SEMUA MURID"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
              />
              <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk merekodkan markah mengikut kelas dalam spreadsheet</p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Kod Tugasan Google Sites
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={kodTugasan}
                  onChange={(e) => setKodTugasan(e.target.value.toUpperCase())}
                  placeholder="GS-XXXXX"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => setKodTugasan(`GS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border border-slate-200"
                  title="Jana Kod Baru"
                >
                  Rawak
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Kod unik ini merekodkan jawapan pelajar di bawah tugasan ini</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              onClick={() => setActiveTab('embed')}
              className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 transition border-b-2 -mb-px ${
                activeTab === 'embed'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>1. Kod Embed HTML (Disyorkan)</span>
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 transition border-b-2 -mb-px ${
                activeTab === 'url'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>2. Pautan URL Google Sites</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 transition border-b-2 -mb-px ${
                activeTab === 'guide'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>3. Panduan Langkah-demi-Langkah</span>
            </button>
          </div>

          {/* TAB 1: KOD EMBED HTML */}
          {activeTab === 'embed' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Salin kod HTML ini dan tampal ke pilihan <strong>Insert &gt; Embed &gt; Embed code</strong> di Google Sites:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-bold">Tinggi Iframe:</span>
                  <select 
                    value={frameHeight}
                    onChange={(e) => setFrameHeight(e.target.value)}
                    className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="600">600px (Kompak)</option>
                    <option value="680">680px (Standard)</option>
                    <option value="780">780px (Panjang)</option>
                    <option value="880">880px (Skrin Penuh)</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-blue-200 text-xs font-mono p-4 rounded-2xl overflow-x-auto leading-relaxed border border-slate-800 max-h-40 selection:bg-blue-600 selection:text-white">
                  {embedCodeSnippet}
                </pre>
                <button
                  onClick={copyEmbedCode}
                  className="absolute top-2.5 right-2.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Berjaya Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kod Embed</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <div className="leading-relaxed">
                  <strong>Kelebihan Kod Embed:</strong> Menyediakan bingkai responsif yang melaraskan kandungan secara automatik mengikut saiz skrin komputer atau telefon pintar murid, serta menyembunyikan navigasi luar.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAUTAN URL GOOGLE SITES */}
          {activeTab === 'url' && (
            <div className="space-y-3.5">
              <span className="text-xs font-bold text-slate-700 block">
                Gunakan pautan ini jika anda memilih pilihan <strong>Insert &gt; Embed &gt; By URL</strong> di Google Sites:
              </span>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={sitesEmbedUrl}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-700 select-all outline-none"
                />
                <button
                  onClick={copySitesUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin URL</span>
                    </>
                  )}
                </button>
                <a
                  href={sitesEmbedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-300 flex items-center justify-center transition"
                  title="Uji buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <p className="text-[11px] text-slate-500">
                Pautan ini telah dioptimumkan secara khusus dengan parameter <code>mod=umum</code> dan <code>embed=sites</code> untuk paparan kemas tanpa memerlukan akaun Google Chrome murid.
              </p>
            </div>
          )}

          {/* TAB 3: PANDUAN LANGKAH-DEMI-LANGKAH */}
          {activeTab === 'guide' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Buka Google Sites</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Buka laman web anda di <a href="https://sites.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">sites.google.com</a> dan pergi ke halaman yang ingin dimasukkan soalan.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Pilih Menu Embed</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Di panel sebelah kanan, klik tab <strong>Insert</strong> (Sisipkan) ➔ klik butang <strong>Embed</strong> (&lt; &gt;).
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Tampal Kod atau URL</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Pilih tab <strong>Embed Code</strong> dan tampal kod HTML yang disalin tadi (atau pilih tab <strong>By URL</strong>). Kemudian klik <strong>Next</strong> ➔ <strong>Insert</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Laraskan & Publish</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Tarik bucu kotak untuk membesarkan ruang mengikut kesesuaian reka bentuk Google Sites anda, kemudian tekan butang biru <strong>Publish</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Live Preview */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Pratonton Langsung di Google Sites</span>
                <span className="text-[10px] text-slate-400 font-medium">(Bagaimana murid melihatnya di Google Sites)</span>
              </div>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    previewDevice === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Komputer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    previewDevice === 'mobile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Telefon</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center bg-slate-200/80 p-3 sm:p-5 rounded-xl overflow-hidden">
              <div 
                className={`bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[360px] h-[480px]' : 'w-full h-[380px]'
                }`}
              >
                {/* Mock Google Sites Browser Frame Bar */}
                <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="ml-2 font-mono text-slate-600">sites.google.com/view/portal-sains</span>
                  </div>
                  <span className="font-bold text-slate-400">Google Sites Preview</span>
                </div>
                
                {/* Embedded Frame */}
                <iframe
                  src={sitesEmbedUrl}
                  title="Google Sites Live Preview"
                  className="w-full h-[calc(100%-28px)] border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Markah murid akan direkodkan automatik ke tab <strong>TUGASAN UMUM</strong> &amp; <strong>Markah Murid</strong> Google Sheets.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={copyEmbedCode}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {copiedEmbed ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>Salin Kod &amp; Gunakan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
