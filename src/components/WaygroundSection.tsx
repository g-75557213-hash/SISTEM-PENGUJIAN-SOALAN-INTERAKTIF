import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { GCClass } from '../lib/classroom';

interface WaygroundSectionProps {
  token: string | null;
  classes: GCClass[];
  spreadsheetId: string;
}

export default function WaygroundSection({ token, classes, spreadsheetId }: WaygroundSectionProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    namaTugasan: string;
    namaKelas: string;
    peserta: { nama: string; markah: number }[];
  } | null>(null);
  
  const [match, setMatch] = useState<{
    courseId: string;
    courseWorkId: string;
    namaTugasan: string;
    isWayground: boolean;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setMatch(null);
    setData(null);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const namaTugasan = file.name.replace(/\.xlsx$/i, '');
      let namaKelas = 'Tidak Ditemui';
      
      const detailsSheet = workbook.Sheets['Quiz Details'] || workbook.Sheets['Quiz detail'] || workbook.Sheets['Quiz details'];
      if (detailsSheet) {
        const detailsJson = XLSX.utils.sheet_to_json(detailsSheet, { header: 1 }) as any[][];
        for (const row of detailsJson) {
          if (row && row[0]) {
             const key = row[0].toString().toLowerCase().trim();
             if (key.includes('class') || key.includes('kelas')) {
                namaKelas = row[1] ? row[1].toString().trim() : namaKelas;
                break;
             }
          }
        }
        // Fallback to cell B4 jika gagal ditemui
        if (namaKelas === 'Tidak Ditemui' && detailsSheet['B4'] && detailsSheet['B4'].v) {
          namaKelas = detailsSheet['B4'].v.toString().trim();
        }
      }
      
      const participantSheet = workbook.Sheets['Participant Data'];
      const peserta = [];
      if (participantSheet) {
        const participantJson = XLSX.utils.sheet_to_json(participantSheet) as any[];
        for (const row of participantJson) {
          if (row['Player Name'] && row['Accuracy'] !== undefined) {
            // Find email from row keys dynamically
            let email = '';
            for (const key of Object.keys(row)) {
              const lowerKey = key.toLowerCase().trim();
              if (
                lowerKey === 'email' || 
                lowerKey === 'email address' || 
                lowerKey === 'user email' || 
                lowerKey === 'student email' || 
                lowerKey === 'm-email' || 
                lowerKey === 'emel' || 
                lowerKey === 'e-mel' ||
                lowerKey.includes('email') ||
                lowerKey.includes('emel')
              ) {
                const val = (row[key] || '').toString().trim();
                if (val && val.includes('@')) {
                  email = val;
                  break;
                }
              }
            }
            peserta.push({
              nama: row['Player Name'],
              markah: parseFloat(row['Accuracy']),
              email: email
            });
          }
        }
      }
      
      setData({ namaTugasan, namaKelas, peserta });
      
      if (token) {
        // Cari padanan kelas dan tugasan dari SEMUA kelas untuk lebih robust
        const clean = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const cleanForCompare = (s: string) => {
          return (s || '').toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\b(xlsx|wayground|quiz|quizizz|report|tugasan|laporan|data|excel)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const fileTitleClean = clean(namaTugasan);
        const fileCompareClean = cleanForCompare(namaTugasan);
        const wordsFileName = fileCompareClean.split(' ').filter(w => w.length > 2);

        let allCourseWorks: any[] = [];
        try {
          const cwPromises = classes.map(async (c: any) => {
            try {
              const res = await fetch(`https://classroom.googleapis.com/v1/courses/${c.id}/courseWork`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                const cwData = await res.json();
                return (cwData.courseWork || []).map((cw: any) => ({ ...cw, __courseId: c.id, __className: c.name }));
              }
            } catch (e) {
              console.error(`Gagal mendapat tugasan untuk kelas ${c.name}:`, e);
            }
            return [];
          });
          const results = await Promise.all(cwPromises);
          allCourseWorks = results.flat();
        } catch (e) {
          console.error("Gagal mendapat senarai tugasan:", e);
        }

        let matchedCw = null;
        let isWayground = false;
        let highestScore = 0;

        for (const cw of allCourseWorks) {
          const cwTitleClean = clean(cw.title || '');
          const cwCompareClean = cleanForCompare(cw.title || '');
          let score = 0;
          let hasWaygroundLink = false;

          if (cw.materials) {
            for (const m of cw.materials) {
              if (m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))) {
                hasWaygroundLink = true;
                break;
              }
            }
          }

          // Padanan tajuk tugasan
          if (cwCompareClean && fileCompareClean && cwCompareClean === fileCompareClean) {
            score += 300;
          } 
          else if (cwCompareClean && fileCompareClean && (cwCompareClean.includes(fileCompareClean) || fileCompareClean.includes(cwCompareClean))) {
            score += 200;
          }
          else if (cwTitleClean === fileTitleClean) {
            score += 150;
          } 
          else if (cwTitleClean.includes(fileTitleClean) || fileTitleClean.includes(cwTitleClean)) {
            score += 120;
          }

          // Padanan perkataan
          const wordsCw = cwCompareClean.split(' ').filter((w: string) => w.length > 2);
          const shared = wordsCw.filter((w: string) => wordsFileName.includes(w));
          if (shared.length >= 2) {
            score += shared.length * 40;
          } else if (shared.length === 1) {
            score += 40;
          }

          // Padanan nama kelas jika ada
          if (namaKelas && namaKelas !== 'Tidak Ditemui') {
            const cleanNamaKelas = clean(namaKelas);
            const cleanClassName = clean(cw.__className);
            if (cleanClassName === cleanNamaKelas) {
              score += 100;
            } else if (cleanClassName.includes(cleanNamaKelas) || cleanNamaKelas.includes(cleanClassName)) {
              score += 50;
            }
          }

          if (hasWaygroundLink) {
            score += 100;
          }

          if (score > highestScore && score >= 40) { // Mesti ada sekurang-kurangnya sedikit padanan tajuk atau perkataan
            highestScore = score;
            matchedCw = cw;
            isWayground = hasWaygroundLink;
          }
        }

        if (matchedCw) {
          setMatch({
            courseId: matchedCw.__courseId,
            courseWorkId: matchedCw.id,
            namaTugasan: matchedCw.title,
            isWayground
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert("Ralat memproses fail Excel Wayground.");
    } finally {
      setLoading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSync = async () => {
    if (!match || !data || !token) return;
    
    setLoading(true);
    try {
      // 1. Dapatkan senarai pelajar dalam kelas
      const stuRes = await fetch(`https://classroom.googleapis.com/v1/courses/${match.courseId}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stuData = await stuRes.json();
      const students = stuData.students || [];
      
      // 2. Dapatkan submissions and ensure graded
      const cwRes = await fetch(`https://classroom.googleapis.com/v1/courses/${match.courseId}/courseWork/${match.courseWorkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (cwRes.ok) {
        const cwData = await cwRes.json();
        if (cwData.maxPoints === undefined) {
           await fetch(`https://classroom.googleapis.com/v1/courses/${match.courseId}/courseWork/${match.courseWorkId}?updateMask=maxPoints`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ maxPoints: 100 })
           });
        }
      }

      const subRes = await fetch(`https://classroom.googleapis.com/v1/courses/${match.courseId}/courseWork/${match.courseWorkId}/studentSubmissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subData = await subRes.json();
      const submissions = subData.studentSubmissions || [];
      
      let syncCount = 0;
      
      const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
      const markahMuridRows: any[] = [];
      
      // 3. Match dan Patch markah ke Google Classroom dengan algoritma padanan pintar dua fasa (Greedy Bipartite Matching)
      const matchedStudents = new Map<string, any>(); // p.nama -> student
      const matchedGCStudentIds = new Set<string>();

      const remainingParticipants = [...data.peserta];
      const remainingGCStudents = [...students];

      // Pass 1: 100% exact full name matches (case & punctuation insensitive)
      for (let i = remainingParticipants.length - 1; i >= 0; i--) {
        const p = remainingParticipants[i];
        const matchedS = remainingGCStudents.find((s: any) => {
          return matchNames100Percent(s.profile?.name?.fullName || '', p.nama || '');
        });
        if (matchedS) {
          matchedStudents.set(p.nama, matchedS);
          matchedGCStudentIds.add(matchedS.userId);
          remainingParticipants.splice(i, 1);
          const sIdx = remainingGCStudents.indexOf(matchedS);
          if (sIdx !== -1) remainingGCStudents.splice(sIdx, 1);
        }
      }

      // Pass 2: Smart Greedy Fuzzy Matches (seperti "ahmad lutfi afif bin amarozaimi" -> "ahmad lutfi")
      const pairs: Array<{ participant: any; student: any; score: number }> = [];
      for (const p of remainingParticipants) {
        for (const s of remainingGCStudents) {
          const score = getSmartFuzzyMatchScore(s.profile?.name?.fullName || '', p.nama || '');
          if (score >= 60) {
            pairs.push({ participant: p, student: s, score });
          }
        }
      }

      // Isytihar padanan bermula dari skor tertinggi ke terendah
      pairs.sort((a, b) => b.score - a.score);

      for (const pair of pairs) {
        if (matchedGCStudentIds.has(pair.student.userId) || matchedStudents.has(pair.participant.nama)) {
          continue;
        }
        matchedStudents.set(pair.participant.nama, pair.student);
        matchedGCStudentIds.add(pair.student.userId);
      }

      // Sekarang hantar markah ke Google Classroom
      for (const p of data.peserta) {
        const matchedStudent = matchedStudents.get(p.nama);
        
        let gcSynced = false;
        if (matchedStudent) {
          const sub = submissions.find((s: any) => s.userId === matchedStudent.userId);
          if (sub) {
            try {
              // 1. PATCH the draftGrade
              const patchRes = await fetch(`https://classroom.googleapis.com/v1/courses/${match.courseId}/courseWork/${match.courseWorkId}/studentSubmissions/${sub.id}?updateMask=draftGrade`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  draftGrade: p.markah
                })
              });

              if (!patchRes.ok) {
                 const errText = await patchRes.text();
                 console.error("Error patching:", errText);
                 if (errText.includes("ProjectPermissionDenied")) {
                   throw new Error("Tugasan ini tidak dicipta oleh aplikasi ini. Google Classroom menghalang kemas kini markah.");
                 }
                 throw new Error(errText);
              }

              // 2. Return the submission to finalize the grade
              const returnRes = await fetch(`https://classroom.googleapis.com/v1/courses/${match.courseId}/courseWork/${match.courseWorkId}/studentSubmissions/${sub.id}:return`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
              });

              if (!returnRes.ok) {
                 const errText = await returnRes.text();
                 console.error("Error returning:", errText);
              }

              syncCount++;
              gcSynced = true;
            } catch (err) {
              console.error(`Gagal sync markah bagi ${p.nama}:`, err);
            }
          }
        }
        
        markahMuridRows.push([
          timestamp,
          'WAYGROUND',
          p.nama,
          matchedStudent?.profile?.emailAddress || p.email || '',
          data.namaKelas,
          match.namaTugasan,
          p.markah,
          'Selesai Menjawab',
          gcSynced ? 'Synced' : 'Not in GC',
          `WG-${match.courseWorkId}`
        ]);
      }
      
      // 4. Simpan ke Google Sheets tab "Data Wayground" dan "Markah Murid"
      try {
        // Buat sheet jika tiada
        const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const metadata = await metadataRes.json();
        const sheetTitles = metadata.sheets?.map((s: any) => s.properties.title) || [];
        
        if (!sheetTitles.includes('Data Wayground')) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: { title: 'Data Wayground' }
                  }
                }
              ]
            })
          });
          
          // Header row - EXACTLY 5 COLUMNS as requested
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Data%20Wayground!A1:E1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [["TIME STAMP", "NAMA KELAS", "NAMA TUGASAN", "NAMA PELAJAR", "MARKAH"]]
            })
          });
        }
        
        // Append data - EXACTLY 5 COLUMNS as requested
        const rowsToAppend = data.peserta.map(p => [
          timestamp,
          data.namaKelas,
          match.namaTugasan,
          p.nama,
          p.markah
        ]);
        
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Data%20Wayground!A:E:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: rowsToAppend })
        });
        
        // Append to Markah Murid
        if (markahMuridRows.length > 0) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Markah%20Murid!A:J:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: markahMuridRows })
          });
        }
        
      } catch (err) {
        console.error("Gagal menyimpan ke sheet Data Wayground / Markah Murid", err);
      }
      
      alert(`Berjaya! ${syncCount} / ${data.peserta.length} markah pelajar telah disync ke Google Classroom.`);
      setData(null);
      setMatch(null);
      
    } catch (err) {
      console.error(err);
      alert("Ralat semasa sync markah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fff0f7] p-4 rounded-xl shadow-sm mb-6 border border-[#ffcce3]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 border border-[#ffcce3]">
            <svg className="w-7 h-7 text-[#ff158a]" viewBox="0 0 100 100" fill="currentColor">
              <path d="M15 75h12l10-25H25z" />
              <path d="M40 75h15l15-40H55z" />
              <path d="M68 75h18l15-55H83z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#b80b62] flex items-center gap-2">
              WAYGROUND
              <span className="bg-[#ff158a]/10 text-[#e01078] text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold border border-[#ff158a]/20">Integrasi</span>
            </h2>
            <p className="text-xs text-[#b80b62]/80">Muat naik laporan markah dari Wayground untuk disync ke Google Classroom.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!data && (
            <>
              <input 
                type="file" 
                accept=".xlsx" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none bg-white hover:bg-[#ffe6f0] text-[#e01078] border border-[#ffcce3] px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center transition shadow-sm shrink-0 whitespace-nowrap"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Memuatkan...</>
                ) : (
                  <><UploadCloud className="w-4 h-4 mr-2" /> Muat Naik .xlsx</>
                )}
              </button>
            </>
          )}

          <a 
            href="https://wayground.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none bg-[#ff158a] hover:bg-[#e01078] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center transition shadow-sm shrink-0 whitespace-nowrap"
          >
            Wayground
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
      
      {data && (
        <div className="mt-4 p-4 rounded-xl border border-[#ffcce3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-bold text-[#b80b62] text-sm">{data.namaTugasan}</h3>
              {match?.isWayground && (
                <span className="bg-[#ff158a] text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-sm">
                  WAYGROUND
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-[#b80b62]">
              <div><span className="font-bold opacity-70">Kelas:</span> {data.namaKelas}</div>
              <div><span className="font-bold opacity-70">Pelajar:</span> {data.peserta.length}</div>
            </div>
            
            {match ? (
              <div className="mt-2.5 text-xs flex items-center text-emerald-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Tugasan "{match.namaTugasan}" dijumpai di Classroom.
              </div>
            ) : (
              <div className="mt-2.5 text-xs flex items-center text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Kelas atau tugasan tidak dijumpai di Google Classroom.
              </div>
            )}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button 
              onClick={() => { setData(null); setMatch(null); }}
              className="px-4 py-2 bg-white border border-[#ffcce3] hover:bg-[#ffe6f0] rounded-xl text-sm font-bold text-[#e01078] transition"
              disabled={loading}
            >
              Batal
            </button>
            <button 
              onClick={handleSync}
              disabled={!match || loading}
              className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition flex items-center shadow-sm ${match ? 'bg-[#ff158a] hover:bg-[#e01078]' : 'bg-slate-300 cursor-not-allowed text-slate-500'}`}
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Salin & Sync Markah</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getMalaysianNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  
  const clean = (s: string) => s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const n1 = clean(name1);
  const n2 = clean(name2);
  
  if (n1 === n2) return 1000; // Perfect match

  const stopwords = [
    'bin', 'binti', 'bt', 'b', 'mohd', 'mohammad', 'muhammad', 'nur', 'nik', 
    'wan', 'abdul', 'abd', 'ahmad', 'biny', 'bte', 'al', 'nurul', 'siti', 'haji', 'hj'
  ];

  const words1 = n1.split(' ').filter(Boolean);
  const words2 = n2.split(' ').filter(Boolean);

  const sig1 = words1.filter(w => !stopwords.includes(w) && w.length > 1);
  const sig2 = words2.filter(w => !stopwords.includes(w) && w.length > 1);

  const finalSig1 = sig1.length > 0 ? sig1 : words1;
  const finalSig2 = sig2.length > 0 ? sig2 : words2;

  if (finalSig1.length === 0 || finalSig2.length === 0) return 0;

  let score = 0;
  const matched2 = new Set<string>();

  for (const w1 of finalSig1) {
    // Exact match
    const exactIdx = finalSig2.findIndex(w2 => w2 === w1 && !matched2.has(w2));
    if (exactIdx !== -1) {
      score += 100;
      matched2.add(finalSig2[exactIdx]);
      continue;
    }

    // Partial match
    const partialIdx = finalSig2.findIndex(w2 => (w1.includes(w2) || w2.includes(w1)) && !matched2.has(w2));
    if (partialIdx !== -1) {
      score += 70;
      matched2.add(finalSig2[partialIdx]);
    }
  }

  // Count completely unmatched words on both sides
  const unmatched1 = finalSig1.filter(w => !finalSig2.some(w2 => w2 === w || w.includes(w2) || w2.includes(w)));
  const unmatched2 = finalSig2.filter(w2 => !matched2.has(w2) && !finalSig1.some(w => w === w2 || w.includes(w2) || w2.includes(w)));

  // Conflicting word penalty (prevents false positives between different students)
  if (unmatched1.length > 0 && unmatched2.length > 0) {
    score -= Math.min(unmatched1.length, unmatched2.length) * 80;
  }

  // Small bonus for stopword matches
  for (const w1 of words1) {
    if (stopwords.includes(w1) && words2.includes(w1)) {
      score += 5;
    }
  }

  return score;
}

function matchNamesMalaysian(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  return getMalaysianNameSimilarity(name1, name2) >= 60;
}

function cleanNameForMatch(name: string): string {
  if (!name) return "";
  let s = name.toLowerCase();
  
  // Remove suffixes like kpm-murid, kpm, murid
  s = s.replace(/kpm-murid/g, '')
       .replace(/kpm/g, '')
       .replace(/murid/g, '');
  
  // Remove typical Malay name connectors to match core name words
  s = s.replace(/\bbin\b/g, '')
       .replace(/\bbinti\b/g, '')
       .replace(/\bbt\b/g, '')
       .replace(/\bbiny\b/g, '')
       .replace(/\ba\/l\b/g, '')
       .replace(/\ba\/p\b/g, '')
       .replace(/\babd\b/g, 'abdul')
       .replace(/\bmohd\b/g, 'mohammad')
       .replace(/\bmuhd\b/g, 'muhammad')
       .replace(/\bmd\b/g, 'mohammad');

  // Strip special chars and replace multiple spaces with single space
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function getSmartFuzzyMatchScore(fullNameGC: string, nameWG: string): number {
  if (!fullNameGC || !nameWG) return 0;

  const cleanGC = cleanNameForMatch(fullNameGC);
  const cleanWG = cleanNameForMatch(nameWG);

  if (cleanGC === cleanWG) return 1000; // Perfect match

  const tokensGC = cleanGC.split(' ').filter(Boolean);
  const tokensWG = cleanWG.split(' ').filter(Boolean);

  if (tokensGC.length === 0 || tokensWG.length === 0) return 0;

  const COMMON_MODIFIERS = new Set([
    'nur', 'mohd', 'mohamad', 'mohammad', 'muhammad', 'muhd', 'ahmad', 'abdul', 'abd',
    'wan', 'nik', 'che', 'siti', 'puteri', 'putra', 'megat', 'syarifah', 'syed', 'al', 'el',
    'bin', 'binti', 'bt', 'b', 'biny', 'bte', 'haji', 'hj', 'nurul'
  ]);

  let matchCount = 0;
  let nonCommonMatchCount = 0;
  
  for (const tWG of tokensWG) {
    if (tokensGC.includes(tWG)) {
      matchCount++;
      if (!COMMON_MODIFIERS.has(tWG)) {
        nonCommonMatchCount++;
      }
    } else {
      const hasPartial = tokensGC.some(tGC => tGC.includes(tWG) || tWG.includes(tGC));
      if (hasPartial) {
        matchCount += 0.8;
        if (!COMMON_MODIFIERS.has(tWG)) {
          nonCommonMatchCount += 0.8;
        }
      }
    }
  }

  const isWGSubsetOfGC = tokensWG.every(tWG => 
    tokensGC.includes(tWG) || tokensGC.some(tGC => tGC.includes(tWG) || tWG.includes(tGC))
  );

  if (isWGSubsetOfGC) {
    const hasSpecificComponent = tokensWG.some(tWG => !COMMON_MODIFIERS.has(tWG));
    if (hasSpecificComponent) {
      return 85 + (nonCommonMatchCount * 5); 
    } else {
      return 10;
    }
  }

  const isGCSubsetOfWG = tokensGC.every(tGC => 
    tokensWG.includes(tGC) || tokensGC.some(tWG => tWG.includes(tGC) || tGC.includes(tWG))
  );
  if (isGCSubsetOfWG) {
    const hasSpecificComponent = tokensGC.some(tGC => !COMMON_MODIFIERS.has(tGC));
    if (hasSpecificComponent) {
      return 80 + (nonCommonMatchCount * 5);
    }
  }

  const similarityScore = getMalaysianNameSimilarity(fullNameGC, nameWG);
  if (similarityScore >= 60 && nonCommonMatchCount >= 0.8) {
    return similarityScore;
  }

  return 0;
}

function matchNames100Percent(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  return cleanNameForMatch(name1) === cleanNameForMatch(name2);
}
