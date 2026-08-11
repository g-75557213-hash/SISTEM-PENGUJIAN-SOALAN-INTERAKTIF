import { useState, useEffect, useMemo } from 'react';
import { GCClass, getAssignments, getStudentSubmissions, getStudents, getTeachers, patchStudentSubmissionGrade, returnStudentSubmission } from '../lib/classroom';
import { CheckCircle, RotateCcw } from 'lucide-react';
import { SoalanData } from '../lib/sheets';
import { logout } from '../lib/firebase';

export default function SemakanGuru({ 
  user, 
  classes, 
  token,
  assignmentStatus,
  questions = [],
  loadAssignmentStatus,
  gasWebAppUrl,
  spreadsheetId
}: { 
  user: any, 
  classes: GCClass[], 
  token: string | null,
  assignmentStatus: Record<string, any>,
  questions?: SoalanData[],
  loadAssignmentStatus?: () => void,
  gasWebAppUrl?: string,
  spreadsheetId?: string
}) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [ourSubmissions, setOurSubmissions] = useState<any[]>([]);
  const [waygroundData, setWaygroundData] = useState<any[]>([]);
  const [currentTugasanMatch, setCurrentTugasanMatch] = useState({ qid: '', kodUnik: '' });
  
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'score'>('name');

  const waygroundMatches = useMemo(() => {
    if (!selectedAssignment || !selectedClass) return {};
    
    const selectedClassObj = classes.find(c => c.id === selectedClass);
    const selectedClassName = (selectedClassObj?.name || '').toLowerCase().trim();

    const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignment);
    const selectedAssignmentTitle = (selectedAssignmentObj?.title || '').toLowerCase().trim();

    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    let isWaygroundAssn = selectedAssignmentObj?.materials?.some((m: any) => 
      m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))
    );

    if (!isWaygroundAssn && waygroundData && waygroundData.length > 0) {
      isWaygroundAssn = waygroundData.some(row => {
        const rowKelas = (row.namaKelas || '').toLowerCase().trim();
        const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();
        return (rowKelas === selectedClassName || rowKelas.includes(selectedClassName) || selectedClassName.includes(rowKelas) || cleanStr(rowKelas) === cleanStr(selectedClassName)) &&
               (rowTugasan === selectedAssignmentTitle || rowTugasan.includes(selectedAssignmentTitle) || selectedAssignmentTitle.includes(rowTugasan) || cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle));
      });
    }

    if (!isWaygroundAssn) return {};

    const candidates: any[] = [];
    const seenRows = new Set<string>();

    if (waygroundData && waygroundData.length > 0) {
      for (const row of waygroundData) {
        const rowKelas = (row.namaKelas || '').toLowerCase().trim();
        const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();
        
        const matchKelas = rowKelas === selectedClassName || 
                           rowKelas.includes(selectedClassName) || 
                           selectedClassName.includes(rowKelas) ||
                           cleanStr(rowKelas) === cleanStr(selectedClassName);
                           
        const matchTugasan = rowTugasan === selectedAssignmentTitle || 
                             rowTugasan.includes(selectedAssignmentTitle) || 
                             selectedAssignmentTitle.includes(rowTugasan) ||
                             cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle);

        if (matchKelas && matchTugasan) {
          const key = `wayground-${row.namaPelajar}-${row.timestamp}-${row.markah}`;
          if (!seenRows.has(key)) {
            seenRows.add(key);
            candidates.push({
              type: 'wayground',
              raw: row,
              name: row.namaPelajar,
              email: row.email,
              markah: row.markah,
              timestamp: row.timestamp || ''
            });
          }
        }
      }
    }

    if (ourSubmissions && ourSubmissions.length > 0) {
      for (const row of ourSubmissions) {
        const rowQid = (row.qid || '').toUpperCase().trim();
        const rowKelas = (row.kelas || '').toLowerCase().trim();
        const rowTugasan = (row.tugasan || '').toLowerCase().trim();

        const isRowWayground = rowQid === 'WAYGROUND' || (row.kodUnik || '').toUpperCase().startsWith('WG-');
        if (isRowWayground) {
          const matchKelas = rowKelas === selectedClassName || 
                             rowKelas.includes(selectedClassName) || 
                             selectedClassName.includes(rowKelas) ||
                             cleanStr(rowKelas) === cleanStr(selectedClassName);
                             
          const matchTugasan = rowTugasan === selectedAssignmentTitle || 
                               rowTugasan.includes(selectedAssignmentTitle) || 
                               selectedAssignmentTitle.includes(rowTugasan) ||
                               cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle);

          if (matchKelas && matchTugasan) {
            const key = `allmarks-${row.nama || row.namaPelajar}-${row.timestamp}-${row.markah}`;
            if (!seenRows.has(key)) {
              seenRows.add(key);
              candidates.push({
                type: 'allmarks',
                raw: row,
                name: row.nama || row.namaPelajar,
                email: row.email,
                markah: row.markah,
                timestamp: row.timestamp || ''
              });
            }
          }
        }
      }
    }

    const matchedStudents = new Map<string, any>();
    const matchedCandidates = new Set<any>();

    const remainingStudents = [...students];

    // Pass 1: 100% exact clean name matches
    for (let i = remainingStudents.length - 1; i >= 0; i--) {
      const student = remainingStudents[i];
      const sName = student.profile?.name?.fullName || '';
      
      const foundCandidate = candidates.find(c => {
        if (matchedCandidates.has(c)) return false;
        return matchNames100Percent(sName, c.name);
      });

      if (foundCandidate) {
        matchedStudents.set(student.userId, foundCandidate);
        matchedCandidates.add(foundCandidate);
        remainingStudents.splice(i, 1);
      }
    }

    // Pass 2: Smart Greedy Fuzzy Matches
    const remainingCandidates = candidates.filter(c => !matchedCandidates.has(c));
    const pairs: Array<{ student: any; candidate: any; score: number }> = [];

    for (const student of remainingStudents) {
      const sName = student.profile?.name?.fullName || '';
      for (const c of remainingCandidates) {
        const score = getSmartFuzzyMatchScore(sName, c.name);
        if (score >= 60) {
          pairs.push({ student, candidate: c, score });
        }
      }
    }

    pairs.sort((a, b) => b.score - a.score);

    const matchedStudentIds = new Set<string>();
    for (const pair of pairs) {
      if (matchedStudentIds.has(pair.student.userId) || matchedCandidates.has(pair.candidate)) {
        continue;
      }
      matchedStudents.set(pair.student.userId, pair.candidate);
      matchedCandidates.add(pair.candidate);
      matchedStudentIds.add(pair.student.userId);
    }

    const result: Record<string, any> = {};
    for (const student of students) {
      const candidate = matchedStudents.get(student.userId);
      if (candidate) {
        if (candidate.type === 'wayground') {
          result[student.userId] = {
            timestamp: candidate.raw.timestamp || '',
            qid: 'WAYGROUND',
            nama: candidate.raw.namaPelajar,
            email: student.profile?.emailAddress || '',
            kelas: candidate.raw.namaKelas,
            tugasan: candidate.raw.namaTugasan,
            markah: candidate.raw.markah,
            status: 'Selesai Menjawab',
            syncStatus: '',
            kodUnik: `WG-${selectedAssignment}`
          };
        } else {
          result[student.userId] = candidate.raw;
        }
      }
    }

    return result;
  }, [students, waygroundData, ourSubmissions, selectedAssignment, selectedClass, classes, assignments]);

  useEffect(() => {
    if (selectedClass && token) {
      setLoading(true);
      Promise.all([
        getAssignments(token, selectedClass),
        getStudents(token, selectedClass),
        getTeachers(token, selectedClass).catch(() => [])
      ]).then(([assns, stds, tchs]) => {
        setAssignments(assns);
        setStudents(stds);
        setTeachers(tchs);
        setSelectedAssignment('');
        setSubmissions([]);
        setOurSubmissions([]);
        setWaygroundData([]);
      }).finally(() => setLoading(false));
    } else {
      setAssignments([]);
      setStudents([]);
      setTeachers([]);
      setSelectedAssignment('');
      setSubmissions([]);
      setOurSubmissions([]);
      setWaygroundData([]);
    }
  }, [selectedClass, token]);

  useEffect(() => {
    if (selectedClass && selectedAssignment && token) {
      setLoading(true);

      const promises: any[] = [
        getStudentSubmissions(token, selectedClass, selectedAssignment),
        import('../lib/sheets').then(m => m.getMarkahMurid(token, spreadsheetId)).catch(() => []),
        import('../lib/sheets').then(m => m.getTugasanRows(token, spreadsheetId)).catch(() => []),
        import('../lib/sheets').then(m => m.getDataWayground(token, spreadsheetId)).catch(() => [])
      ];

      Promise.all(promises)
        .then(results => {
          setSubmissions(results[0]);
          if (Array.isArray(results[1])) {
            setOurSubmissions(results[1]);
          } else {
            setOurSubmissions([]);
          }
          if (Array.isArray(results[3])) {
            setWaygroundData(results[3]);
          } else {
            setWaygroundData([]);
          }
          
          const tugasanRows = results[2] || [];
          let foundQid = '';
          let foundKod = '';
          
          for (const row of tugasanRows) {
            if (row.length >= 8 && 
                row[6]?.toString().trim() === selectedClass.toString().trim() && 
                row[7]?.toString().trim() === selectedAssignment.toString().trim()) {
              foundQid = row[1] || '';
              foundKod = row[3] || '';
              break;
            }
          }
          
          // Check if it is a Wayground assignment
          const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignment);
          let isWayground = false;
          if (selectedAssignmentObj && selectedAssignmentObj.materials) {
            for (const m of selectedAssignmentObj.materials) {
              if (m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))) {
                isWayground = true;
                break;
              }
            }
          }
          
          if (!isWayground && Array.isArray(results[3])) {
            const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const selectedClassObj = classes.find(c => c.id === selectedClass);
            const selectedClassName = (selectedClassObj?.name || '').toLowerCase().trim();
            const selectedAssignmentTitle = (selectedAssignmentObj?.title || '').toLowerCase().trim();
            
            isWayground = results[3].some((row: any) => {
              const rowKelas = (row.namaKelas || '').toLowerCase().trim();
              const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();
              return (rowKelas === selectedClassName || rowKelas.includes(selectedClassName) || selectedClassName.includes(rowKelas) || cleanStr(rowKelas) === cleanStr(selectedClassName)) &&
                     (rowTugasan === selectedAssignmentTitle || rowTugasan.includes(selectedAssignmentTitle) || selectedAssignmentTitle.includes(rowTugasan) || cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle));
            });
          }
          
          if (isWayground) {
            foundQid = 'WAYGROUND';
            foundKod = `WG-${selectedAssignment}`;
          }
          
          // Fallback QID from assignmentStatus if not found in sheets
          if (!foundQid) {
            for (const key in assignmentStatus) {
              const s = assignmentStatus[key];
              if (s.assignmentId === selectedAssignment || (s.assignments && s.assignments.some((asgn: any) => asgn.assignmentId === selectedAssignment))) {
                foundQid = s.qid;
                break;
              }
            }
          }
          
          setCurrentTugasanMatch({ qid: foundQid, kodUnik: foundKod });
        })
        .finally(() => setLoading(false));
    } else {
      setSubmissions([]);
      setOurSubmissions([]);
      setWaygroundData([]);
      setCurrentTugasanMatch({ qid: '', kodUnik: '' });
    }
  }, [selectedAssignment, selectedClass, token, spreadsheetId, assignmentStatus, assignments]);

  const getStudentName = (userId: string) => {
    const s = students.find(x => x.userId === userId);
    return s ? s.profile.name.fullName : 'Pelajar Tidak Dikenali';
  };

  const getStudentEmail = (userId: string) => {
    const s = students.find(x => x.userId === userId);
    return s ? s.profile.emailAddress : '';
  };

  // Advanced, robust searching helper as requested by the user
  const findStudentSheetRow = (student: any, allMarks: any[] = ourSubmissions) => {
    const studentEmail = (student.profile?.emailAddress || '').toLowerCase().trim();
    const studentName = (student.profile?.name?.fullName || '').toLowerCase().trim();

    const selectedClassObj = classes.find(c => c.id === selectedClass);
    const selectedClassName = (selectedClassObj?.name || '').toLowerCase().trim();

    const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignment);
    const selectedAssignmentTitle = (selectedAssignmentObj?.title || '').toLowerCase().trim();

    const matchedQid = currentTugasanMatch.qid;
    const matchedKodUnik = currentTugasanMatch.kodUnik;

    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // Determine if it is a Wayground assignment:
    // 1. By link/materials URL containing wayground or quizizz
    let isWaygroundAssn = selectedAssignmentObj?.materials?.some((m: any) => 
      m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))
    );

    // 2. Or by looking inside waygroundData for entries matching this class & assignment title
    if (!isWaygroundAssn && waygroundData && waygroundData.length > 0) {
      isWaygroundAssn = waygroundData.some(row => {
        const rowKelas = (row.namaKelas || '').toLowerCase().trim();
        const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();
        return (rowKelas === selectedClassName || rowKelas.includes(selectedClassName) || selectedClassName.includes(rowKelas) || cleanStr(rowKelas) === cleanStr(selectedClassName)) &&
               (rowTugasan === selectedAssignmentTitle || rowTugasan.includes(selectedAssignmentTitle) || selectedAssignmentTitle.includes(rowTugasan) || cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle));
      });
    }

    if (isWaygroundAssn) {
      return waygroundMatches[student.userId] || null;
    }

    if (!allMarks || allMarks.length === 0) return null;

    const evaluateRow = (row: any) => {
      const rowQid = (row.qid || '').toUpperCase().trim();
      const rowKelas = (row.kelas || '').toLowerCase().trim();
      const rowTugasan = (row.tugasan || '').toLowerCase().trim();
      const rowKodUnik = (row.kodUnik || '').toUpperCase().trim();

      // STRICT CHECK 1: If this row is for a different quiz question (QID mismatch), skip it
      if (matchedQid && rowQid && matchedQid.toUpperCase().trim() !== rowQid) {
        return -1;
      }

      // STRICT CHECK 2: If BOTH the assignment and the row have assignment codes (Kod Unik), and they don't match, skip it
      if (matchedKodUnik && rowKodUnik && matchedKodUnik.toUpperCase().trim() !== rowKodUnik) {
        return -1;
      }

      let score = 0;

      // Match Kod Unik (Highest Priority, absolute certainty)
      if (matchedKodUnik && rowKodUnik === matchedKodUnik.toUpperCase().trim()) {
        score += 1000;
      }

      // Match QID (high priority)
      if (matchedQid && rowQid === matchedQid.toUpperCase().trim()) {
        score += 100;
      }

      // Match Class Name
      if (selectedClassName && rowKelas && (rowKelas === selectedClassName || selectedClassName.includes(rowKelas) || rowKelas.includes(selectedClassName))) {
        score += 10;
      }

      // Match Assignment Name
      if (selectedAssignmentTitle && rowTugasan && (rowTugasan === selectedAssignmentTitle || selectedAssignmentTitle.includes(rowTugasan) || rowTugasan.includes(selectedAssignmentTitle))) {
        score += 10;
      }

      // Special case: If row has "Tiada Kelas" or "Tiada Tugasan" but matches the QID
      if (matchedQid && rowQid === matchedQid.toUpperCase().trim() && (rowKelas === 'tiada kelas' || rowTugasan === 'tiada tugasan')) {
        score += 5;
      }

      return score;
    };

    // Try to find rows matching by email first (Highest priority and certainty)
    if (studentEmail) {
      let bestRow = null;
      let bestScore = -1;

      for (const row of allMarks) {
        const rowEmail = (row.email || '').toLowerCase().trim();
        if (rowEmail === studentEmail) {
          const score = evaluateRow(row);
          if (score > bestScore && score >= 0) {
            bestScore = score;
            bestRow = row;
          }
        }
      }

      if (bestRow) return bestRow;
    }

    return null;
  };

  const getAssignmentSheetRows = () => {
    const selectedClassObj = classes.find(c => c.id === selectedClass);
    const selectedClassName = (selectedClassObj?.name || '').toLowerCase().trim();

    const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignment);
    const selectedAssignmentTitle = (selectedAssignmentObj?.title || '').toLowerCase().trim();

    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    let isWaygroundAssn = selectedAssignmentObj?.materials?.some((m: any) => 
      m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))
    );

    if (!isWaygroundAssn && waygroundData && waygroundData.length > 0) {
      isWaygroundAssn = waygroundData.some(row => {
        const rowKelas = (row.namaKelas || '').toLowerCase().trim();
        const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();
        return (rowKelas === selectedClassName || rowKelas.includes(selectedClassName) || selectedClassName.includes(rowKelas) || cleanStr(rowKelas) === cleanStr(selectedClassName)) &&
               (rowTugasan === selectedAssignmentTitle || rowTugasan.includes(selectedAssignmentTitle) || selectedAssignmentTitle.includes(rowTugasan) || cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle));
      });
    }

    if (isWaygroundAssn && waygroundData && waygroundData.length > 0) {
      return waygroundData
        .filter(row => {
          const rowKelas = (row.namaKelas || '').toLowerCase().trim();
          const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();

          const matchKelas = rowKelas === selectedClassName || 
                             rowKelas.includes(selectedClassName) || 
                             selectedClassName.includes(rowKelas) ||
                             cleanStr(rowKelas) === cleanStr(selectedClassName);
                             
          const matchTugasan = rowTugasan === selectedAssignmentTitle || 
                               rowTugasan.includes(selectedAssignmentTitle) || 
                               selectedAssignmentTitle.includes(rowTugasan) ||
                               cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle);

          return matchKelas && matchTugasan;
        })
        .map(row => {
          const matchedStudent = students.find(student => {
            return matchNames100Percent(student.profile?.name?.fullName || '', row.namaPelajar || '');
          });

          return {
            timestamp: row.timestamp || '',
            qid: 'WAYGROUND',
            nama: row.namaPelajar,
            email: matchedStudent?.profile?.emailAddress || row.email || 'Tiada E-mel',
            kelas: row.namaKelas,
            tugasan: row.namaTugasan,
            markah: row.markah,
            status: 'Selesai Menjawab',
            syncStatus: '',
            kodUnik: `WG-${selectedAssignment}`
          };
        });
    }

    if (!ourSubmissions || ourSubmissions.length === 0) return [];
    
    const matchedQid = (currentTugasanMatch.qid || '').toUpperCase().trim();
    const matchedKodUnik = (currentTugasanMatch.kodUnik || '').toUpperCase().trim();
    
    return ourSubmissions.filter(row => {
      const rowQid = (row.qid || '').toUpperCase().trim();
      const rowKodUnik = (row.kodUnik || '').toUpperCase().trim();
      
      if (matchedQid && rowQid && matchedQid !== rowQid) {
        return false;
      }
      if (matchedKodUnik && rowKodUnik && matchedKodUnik !== rowKodUnik) {
        return false;
      }
      return matchedQid || matchedKodUnik;
    });
  };

  const handleSyncMarkah = async () => {
    let matchedQid = currentTugasanMatch.qid;

    if (!matchedQid) {
      alert("Tiada ID Soalan (QID) dipadankan dengan tugasan ini. Sila pastikan tugasan ini dipautkan kepada satu soalan kuiz.");
      return;
    }

    if (!token) {
      alert("Sesi log masuk tamat tempoh. Sila log masuk semula.");
      return;
    }

    setIsSyncing(true);

    try {
      // 1. Ambil maklumat markah dari spreadsheet "Markah Murid"
      const { getMarkahMurid } = await import('../lib/sheets');
      const allSheetMarks = await getMarkahMurid(token, spreadsheetId);
      
      if (allSheetMarks.length === 0) {
        alert("Tiada rekod markah dijumpai dalam spreadsheet 'Markah Murid'.");
        setIsSyncing(false);
        return;
      }

      // Selaras dan muatkan data terkini ke senarai pelajar di UI
      setOurSubmissions(allSheetMarks);

      // 2. Ambil butiran tugasan Classroom untuk dapatkan maxPoints (gred maksimum)
      let maxPoints = 100;
      try {
        const courseworkRes = await fetch(`https://classroom.googleapis.com/v1/courses/${selectedClass}/courseWork/${selectedAssignment}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (courseworkRes.ok) {
          const courseworkData = await courseworkRes.json();
          if (courseworkData.maxPoints !== undefined) {
            maxPoints = courseworkData.maxPoints;
          } else {
            // Update to graded assignment if it was ungraded
            console.log("Coursework is ungraded, updating to maxPoints 100...");
            await fetch(`https://classroom.googleapis.com/v1/courses/${selectedClass}/courseWork/${selectedAssignment}?updateMask=maxPoints`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ maxPoints: 100 })
            });
            maxPoints = 100;
          }
        }
      } catch (err) {
        console.warn("Gagal mendapatkan maxPoints, menggunakan nilai standard 100:", err);
      }

      // 3. Cari dan kemas kini setiap markah pelajar secara langsung di Google Classroom
      let successCount = 0;
      let failCount = 0;
      let emailNotFoundCount = 0;
      let lastError = "";

      for (const student of students) {
        const email = student.profile?.emailAddress?.toLowerCase().trim();
        
        // Cari markah pelajar dalam rekod helaian secara dinamik dan robust (nama & email & qid)
        const match = findStudentSheetRow(student, allSheetMarks);
        
        if (match && match.markah !== undefined && !isNaN(match.markah)) {
          // Cari submission sepadan bagi pelajar ini
          const sub = submissions.find(s => s.userId === student.userId);
          if (sub) {
            try {
              // Tukar markah peratusan ke skala maxPoints tugasan Classroom
              const finalGrade = Math.round((match.markah / 100) * maxPoints);
              
              await patchStudentSubmissionGrade(token, selectedClass, selectedAssignment, sub.id, finalGrade);
              
              // Mark as complete by returning the submission
              try {
                await returnStudentSubmission(token, selectedClass, selectedAssignment, sub.id);
              } catch(e) {
                console.warn(`Gagal mark as complete bagi ${email || student.profile?.name?.fullName}:`, e);
              }
              
              successCount++;
            } catch (err: any) {
              console.error(`Gagal mengemas kini markah bagi ${email || student.profile?.name?.fullName}:`, err);
              const errStr = err.message || err.toString();
              if (errStr.includes("ProjectPermissionDenied")) {
                lastError = "Google Classroom menghalang aplikasi ini daripada mengubah markah kerana tugasan ini tidak dicipta oleh aplikasi ini. (Polisi Keselamatan Google)";
              } else {
                lastError = errStr;
              }
              failCount++;
            }
          } else {
            lastError = "Submission API tidak dijumpai untuk pelajar ini.";
            failCount++;
          }
        } else {
          emailNotFoundCount++;
        }
      }

      // Rekodkan dalam maklum balas kepada guru
      alert(`Penyegerakan Berjaya!\n\n` +
            `• ${successCount} markah berjaya dimasukkan ke Google Classroom (berasaskan mata gred maks: ${maxPoints}).\n` +
            `• ${failCount} gagal disegerakan (pelajar mungkin belum "Turn In" atau ralat API).\n` +
            `• ${emailNotFoundCount} pelajar dalam senarai kelas belum menjawab kuiz ini di sistem.\n\n` +
            (lastError ? `Ralat terakhir yang direkod: ${lastError}` : ""));

      // 4. Kemas kini paparan senarai submissions dalam aplikasi
      try {
        const updatedSubs = await getStudentSubmissions(token, selectedClass, selectedAssignment);
        setSubmissions(updatedSubs);
      } catch (fetchErr) {
        console.warn("Gagal mengemas kini paparan submissions selepas sync:", fetchErr);
      }

    } catch (err: any) {
      if (err.message === 'UNAUTHENTICATED') {
        alert('Sesi anda telah tamat. Sila log masuk semula.');
        logout();
        return;
      }
      console.error("Gagal melakukan Sync Markah:", err);
      alert(`Gagal menyegerakan markah ke Google Classroom:\n${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'TURNED_IN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'RETURNED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NEW':
      case 'CREATED': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'TURNED_IN': return 'Telah Menjawab';
      case 'RETURNED': return 'Disemak';
      case 'NEW':
      case 'CREATED': return 'Belum Menjawab';
      default: return state;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-[1400px] mx-auto w-full bg-slate-50">
      <div className="bg-white p-4 sm:p-6 border-b border-slate-200 shadow-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpenIcon />
          <h2 className="text-xl font-bold text-slate-800">Semakan Tugasan Google Classroom</h2>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full py-1.5 px-1.5 pr-4 shadow-sm">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Profile" className="w-7 h-7 rounded-full" />
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide truncate max-w-[150px] sm:max-w-none">{user.displayName} KPM-Guru</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 p-4 sm:p-6 gap-4 sm:gap-6 min-h-0 overflow-hidden">
        
        {/* 1. Pilih Kelas */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 font-medium text-slate-700">
            1. Pilih Kelas
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {classes.length === 0 && <p className="text-slate-500 text-sm text-center mt-10">Tiada kelas dijumpai.</p>}
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`w-full text-left p-3 rounded-lg border ${selectedClass === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'} transition`}
              >
                {c.name} {c.section ? `(${c.section})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Pilih Tugasan */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 font-medium text-slate-700">
            2. Pilih Tugasan
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {!selectedClass ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sila pilih kelas dahulu.</div>
            ) : loading && !selectedAssignment ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Memuatkan tugasan...</div>
            ) : assignments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tiada tugasan dijumpai.</div>
            ) : (
              assignments.map(a => {
                let isInteractive = false;
                for (const key in assignmentStatus) {
                  const s = assignmentStatus[key];
                  if (s.assignmentId === a.id) isInteractive = true;
                  if (s.assignments && s.assignments.some((asgn: any) => asgn.assignmentId === a.id || asgn.courseWorkId === a.id)) isInteractive = true;
                }
                
                let isWayground = false;
                if (a.materials) {
                  for (const m of a.materials) {
                    if (m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))) {
                      isWayground = true;
                      break;
                    }
                  }
                }
                
                return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssignment(a.id)}
                  className={`w-full text-left p-3 rounded-lg border ${selectedAssignment === a.id ? (isWayground ? 'border-[#ff158a] bg-[#ffe6f0] text-[#b80b62] shadow-sm' : 'border-blue-500 bg-blue-50 text-blue-700') : isWayground ? 'border-[#ffcce3] bg-[#fff0f7] text-[#e01078] hover:border-[#ff99c8]' : isInteractive ? 'border-[#10b981] bg-[#eefcf4] text-[#064e3b]' : 'border-slate-200 hover:border-slate-300'} transition`}
                >
                  <div className="font-medium flex items-center justify-between">
                    <span className="line-clamp-1">{a.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isWayground && <span className="bg-[#ff158a] text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">WAYGROUND</span>}
                      {isInteractive && !isWayground && <CheckCircle className="w-4 h-4 text-[#10b981]" />}
                    </div>
                  </div>
                  <div className="text-xs mt-1.5 line-clamp-2 opacity-70">
                    {isWayground ? "Tugasan disync dari laporan Wayground." : isInteractive ? "Tugasan ini aktif di Google Classroom!" : (a.description || "Tiada deskripsi.")}
                  </div>
                </button>
              )})
            )}
          </div>
        </div>

        {/* 3. Status Pelajar */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="bg-slate-50 p-4 border-b border-slate-200 font-medium text-slate-700 flex justify-between items-center">
            <span>3. Status Pelajar ({selectedAssignment ? students.length : 0})</span>
            <div className="flex items-center gap-2">
              {selectedClass && selectedAssignment && token && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { getMarkahMurid, getDataWayground } = await import('../lib/sheets');
                      const [updatedSubs, updatedMarks, updatedWayground] = await Promise.all([
                        getStudentSubmissions(token, selectedClass, selectedAssignment),
                        getMarkahMurid(token, spreadsheetId),
                        getDataWayground(token, spreadsheetId).catch(() => [])
                      ]);
                      setSubmissions(updatedSubs);
                      setOurSubmissions(updatedMarks);
                      setWaygroundData(updatedWayground);
                    } catch (err) {
                      console.error("Gagal muat semula data:", err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition"
                  title="Muat semula markah pelajar terkini"
                >
                  <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                  </svg>
                  Muat Semula
                </button>
              )}
              {(() => {
                let matchedQid = currentTugasanMatch.qid;
                if (matchedQid) {
                  return (
                    <button
                      onClick={async () => {
                        if (!confirm("Adakah anda pasti mahu reset status soalan ini? Ini akan memadam semua rekod markah pelajar untuk soalan ini.")) return;
                        try {
                          // Padam dari Google Sheets (Markah Murid sahaja)
                          if (spreadsheetId) {
                            try {
                              const { deleteScoresOnlyFromSheets } = await import('../lib/sheets');
                              await deleteScoresOnlyFromSheets(token!, spreadsheetId, matchedQid);
                            } catch (e) {
                              console.error("Gagal padam rekod markah spreadsheet:", e);
                            }
                          }

                          if (loadAssignmentStatus) await loadAssignmentStatus();
                          alert("Rekod markah pelajar berjaya direset!");
                        } catch (err) {
                          console.error(err);
                          alert("Gagal reset status.");
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
          <div className="p-4 flex flex-col h-full">
            {selectedAssignment && students.length > 0 && (
              <div className="mb-4 shrink-0 space-y-3">
                {/* Google Classroom Sync Panel */}
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 flex justify-center items-center shadow-xs">
                  <button
                    onClick={handleSyncMarkah}
                    disabled={isSyncing}
                    className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider shadow-sm transition w-full ${
                      isSyncing 
                        ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed border border-emerald-200' 
                        : 'bg-[#137333] hover:bg-[#0e5c27] text-white active:scale-95'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-emerald-500 animate-infinite" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sedang Sync...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="3" width="20" height="15" rx="2" fill="#137333" stroke="#F4B400" strokeWidth="2" />
                          <rect x="5" y="18" width="14" height="3" fill="#D9D9D9" />
                          <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
                          <path d="M8.5 14.5C8.5 12.5 10 11.5 12 11.5C14 11.5 15.5 12.5 15.5 14.5V15.5H8.5V14.5Z" fill="#FFFFFF" />
                        </svg>
                        <span>SYNC GOOGLE CLASSROOM</span>
                      </>
                    )}
                  </button>
                </div>

                <input 
                  type="text"
                  placeholder="Cari nama, e-mel, atau markah pelajar..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                />
              </div>
            )}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {!selectedAssignment ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm py-20">Sila pilih tugasan di sebelah kiri dahulu.</div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm py-20">Memuatkan status pelajar...</div>
            ) : (
              <div className="space-y-6">
                
                {/* SCOPE WARNING */}
                {students.length > 0 && students.some(s => s.profile && !s.profile.emailAddress) && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                    <span className="text-xl">ℹ️</span>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 mb-1">Kemas Kini Sistem Dikesan</h4>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Sistem kini memerlukan kebenaran untuk membaca e-mel pelajar dari Google Classroom bagi padanan markah yang lebih tepat. 
                        Oleh kerana anda telah log masuk sebelum fungsi ini ditambah, <strong>sila <button onClick={async () => {
                          const { logout } = await import('../lib/firebase');
                          await logout();
                          window.location.reload();
                        }} className="underline font-bold text-blue-900 hover:text-blue-700">Log Keluar</button> dan log masuk semula</strong> untuk memberikan kebenaran ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* SECTION 1: Classroom Students */}
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Pelajar Google Classroom ({students.length})</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setSortBy('name')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${sortBy === 'name' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        A-Z (Classroom)
                      </button>
                      <button
                        onClick={() => setSortBy('score')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${sortBy === 'score' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Markah
                      </button>
                    </div>
                  </div>
                  
                  {students.length === 0 ? (
                    <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs bg-white">
                      Tiada pelajar berdaftar dalam kelas ini.
                    </div>
                  ) : (
                    (() => {
                      const filtered = students.filter(student => {
                        if (!studentSearch) return true;
                        const searchStr = studentSearch.toLowerCase();
                        const name = (student.profile?.name?.fullName || '').toLowerCase();
                        const email = (student.profile?.emailAddress || '').toLowerCase();
                        
                        const userId = student.userId;
                        const s = submissions.find(sub => sub.userId === userId);
                        const ourSub = findStudentSheetRow(student);
                        let markah = (s && s.assignedGrade !== undefined) ? s.assignedGrade : ((s && s.draftGrade !== undefined) ? s.draftGrade : undefined);
                        if ((markah === undefined || markah === 0) && ourSub?.markah !== undefined) markah = ourSub.markah;
                        
                        const markahStr = markah !== undefined ? markah.toString() : '';
                        return name.includes(searchStr) || email.includes(searchStr) || markahStr.includes(searchStr);
                      });

                      // Sort according to sortBy state
                      const sorted = [...filtered].sort((a, b) => {
                        if (sortBy === 'name') {
                          const nameA = (a.profile?.name?.fullName || '').toLowerCase().trim();
                          const nameB = (b.profile?.name?.fullName || '').toLowerCase().trim();
                          return nameA.localeCompare(nameB);
                        } else {
                          const sA = submissions.find(sub => sub.userId === a.userId);
                          const ourSubA = findStudentSheetRow(a);
                          let markahA = (sA && sA.assignedGrade !== undefined) ? sA.assignedGrade : ((sA && sA.draftGrade !== undefined) ? sA.draftGrade : undefined);
                          if ((markahA === undefined || markahA === 0) && ourSubA?.markah !== undefined) markahA = ourSubA.markah;
                          const scoreA = markahA !== undefined && !isNaN(markahA) ? markahA : -1;

                          const sB = submissions.find(sub => sub.userId === b.userId);
                          const ourSubB = findStudentSheetRow(b);
                          let markahB = (sB && sB.assignedGrade !== undefined) ? sB.assignedGrade : ((sB && sB.draftGrade !== undefined) ? sB.draftGrade : undefined);
                          if ((markahB === undefined || markahB === 0) && ourSubB?.markah !== undefined) markahB = ourSubB.markah;
                          const scoreB = markahB !== undefined && !isNaN(markahB) ? markahB : -1;

                          if (scoreA === scoreB) {
                            const nameA = (a.profile?.name?.fullName || '').toLowerCase().trim();
                            const nameB = (b.profile?.name?.fullName || '').toLowerCase().trim();
                            return nameA.localeCompare(nameB);
                          }
                          return scoreB - scoreA;
                        }
                      });

                      if (sorted.length === 0) {
                        return <div className="text-center text-slate-400 text-xs py-10">Carian tidak menemui hasil.</div>;
                      }

                      return (
                        <div className="space-y-2.5">
                          {sorted.map(student => {
                            const name = student.profile?.name?.fullName || 'Pelajar Tidak Dikenali';
                            const email = student.profile?.emailAddress || '';
                            const userId = student.userId;

                            const s = submissions.find(sub => sub.userId === userId);
                            const ourSub = findStudentSheetRow(student);
                            const ourMarkah = ourSub?.markah;
                            const ourStatus = ourSub?.status;

                            let markah = (s && s.assignedGrade !== undefined) ? s.assignedGrade : ((s && s.draftGrade !== undefined) ? s.draftGrade : undefined);
                            if ((markah === undefined || markah === 0) && ourMarkah !== undefined && !isNaN(ourMarkah)) {
                              markah = ourMarkah;
                            }

                            // Determine Display State
                            let displayState = s ? s.state : 'NEW';
                            const normalizedStatus = (ourStatus || '').toLowerCase().trim();
                            if (displayState !== 'TURNED_IN' && displayState !== 'RETURNED') {
                              if (normalizedStatus === 'telah menjawab' || normalizedStatus === 'selesai menjawab' || (markah !== undefined && !isNaN(markah))) displayState = 'TURNED_IN';
                              else if (normalizedStatus === 'sedang menjawab') displayState = 'ACTIVE';
                            }
                            
                            const getStatusColor = (state) => {
                              switch (state) {
                                case 'TURNED_IN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                case 'RETURNED': return 'bg-blue-100 text-blue-800 border-blue-200';
                                case 'ACTIVE': return 'bg-purple-100 text-purple-800 border-purple-200';
                                case 'NEW':
                                case 'CREATED': return 'bg-amber-100 text-amber-800 border-amber-200';
                                default: return 'bg-slate-100 text-slate-800 border-slate-200';
                              }
                            };
                          
                            const getStatusText = (state) => {
                              switch (state) {
                                case 'TURNED_IN': return 'Selesai Menjawab';
                                case 'RETURNED': return 'Telah Disemak';
                                case 'ACTIVE': return 'Sedang Menjawab';
                                case 'NEW':
                                case 'CREATED': return 'Belum Mula';
                                default: return state;
                              }
                            };

                            const getMarkahBadgeColor = (m: number | undefined) => {
                              if (m === undefined || isNaN(m)) return 'bg-slate-50 text-slate-400 border-slate-200';
                              if (m >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold';
                              if (m >= 60) return 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
                              if (m >= 40) return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                              return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            };

                            return (
                              <div key={userId} className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between bg-white hover:shadow-md transition duration-200">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-semibold text-sm text-slate-800 truncate">{name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate">{email}</div>
                                  <div className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(displayState)}`}>
                                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
                                    {getStatusText(displayState)}
                                  </div>
                                </div>
                                
                                <div className="text-right shrink-0 ml-2">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Markah</div>
                                  <div className={`mt-1 inline-block px-3 py-1 rounded-lg text-sm border ${getMarkahBadgeColor(markah)}`}>
                                    {markah !== undefined ? `${markah}/100` : '-'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* SECTION 2: Unmatched Rows (Pelajar Luar Kelas / Tiada Di Classroom) */}
                {(() => {
                  const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignment);
                  let isWaygroundAssn = selectedAssignmentObj?.materials?.some((m: any) => 
                    m.link && m.link.url && (m.link.url.toLowerCase().includes('wayground') || m.link.url.toLowerCase().includes('quizizz'))
                  );
                  if (!isWaygroundAssn && waygroundData && waygroundData.length > 0) {
                    const selectedClassName = (classes.find(c => c.id === selectedClass)?.name || '').toLowerCase().trim();
                    const selectedAssignmentTitle = (selectedAssignmentObj?.title || '').toLowerCase().trim();
                    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

                    isWaygroundAssn = waygroundData.some(row => {
                      const rowKelas = (row.namaKelas || '').toLowerCase().trim();
                      const rowTugasan = (row.namaTugasan || '').toLowerCase().trim();
                      return (rowKelas === selectedClassName || rowKelas.includes(selectedClassName) || selectedClassName.includes(rowKelas) || cleanStr(rowKelas) === cleanStr(selectedClassName)) &&
                             (rowTugasan === selectedAssignmentTitle || rowTugasan.includes(selectedAssignmentTitle) || selectedAssignmentTitle.includes(rowTugasan) || cleanStr(rowTugasan) === cleanStr(selectedAssignmentTitle));
                    });
                  }

                  if (isWaygroundAssn) return null;

                  const assignmentRows = getAssignmentSheetRows();
                  
                  // Collect all rows that were successfully matched to any student
                  const matchedRowObjects = students.map(s => findStudentSheetRow(s)).filter(Boolean);

                  const areRowsEqual = (a: any, b: any) => {
                    if (!a || !b) return false;
                    if (a === b) return true;
                    // For Wayground / dynamically generated objects, check identifying properties
                    return (a.nama || '').toLowerCase().trim() === (b.nama || '').toLowerCase().trim() &&
                           (a.kelas || '').toLowerCase().trim() === (b.kelas || '').toLowerCase().trim() &&
                           (a.tugasan || '').toLowerCase().trim() === (b.tugasan || '').toLowerCase().trim();
                  };

                  const unmatched = assignmentRows.filter(row => {
                    // If any matched row equals this row, it's not unmatched
                    if (matchedRowObjects.some(mRow => areRowsEqual(mRow, row))) return false;
                    return true;
                  });

                  // Separate teachers from unmatched
                  const isTeacher = (row: any) => {
                    if (!teachers || teachers.length === 0) return false;
                    const rowEmail = (row.email || '').toLowerCase().trim();
                    const rowName = (row.nama || '').toLowerCase().trim();
                    
                    return teachers.some(t => {
                      const tEmail = (t.profile?.emailAddress || '').toLowerCase().trim();
                      const tName = (t.profile?.name?.fullName || '').toLowerCase().trim();
                      if (rowEmail && tEmail && rowEmail === tEmail) return true;
                      
                      // Fuzzy match name
                      if (rowName && tName) {
                         if (rowName === tName) return true;
                         // Check for KPM-Guru suffix
                         const cleanRowName = rowName.replace(/kpm-guru$/i, '').trim();
                         const cleanTName = tName.replace(/kpm-guru$/i, '').trim();
                         if (cleanRowName === cleanTName) return true;
                      }
                      return false;
                    });
                  };

                  const unmatchedTeachers = unmatched.filter(row => isTeacher(row));
                  const unmatchedStudents = unmatched.filter(row => !isTeacher(row));

                  // Apply search filter if active
                  const filteredUnmatchedStudents = unmatchedStudents.filter(row => {
                    if (!studentSearch) return true;
                    const searchStr = studentSearch.toLowerCase();
                    const name = (row.nama || '').toLowerCase();
                    const email = (row.email || '').toLowerCase();
                    const markahStr = row.markah !== undefined ? row.markah.toString() : '';
                    return name.includes(searchStr) || email.includes(searchStr) || markahStr.includes(searchStr);
                  });
                  
                  const filteredUnmatchedTeachers = unmatchedTeachers.filter(row => {
                    if (!studentSearch) return true;
                    const searchStr = studentSearch.toLowerCase();
                    const name = (row.nama || '').toLowerCase();
                    const email = (row.email || '').toLowerCase();
                    const markahStr = row.markah !== undefined ? row.markah.toString() : '';
                    return name.includes(searchStr) || email.includes(searchStr) || markahStr.includes(searchStr);
                  });

                  if (unmatched.length === 0) return null;

                  return (
                    <div className="pt-4 border-t border-slate-200">
                      {filteredUnmatchedStudents.length > 0 && (
                        <div className="mb-6">
                          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>Pelajar Luar Kelas / E-mel Tidak Berdaftar di Classroom ({filteredUnmatchedStudents.length})</span>
                          </div>
                          <div className="space-y-2.5">
                            {filteredUnmatchedStudents.map((row, idx) => {
                              const name = row.nama || 'Pelajar Tanpa Nama';
                              const email = row.email || 'Tiada E-mel';
                              const score = row.markah;
                              const statusStr = (row.status || 'Telah menjawab').toLowerCase();
                              
                              let displayState = 'TURNED_IN';
                              if (statusStr.includes('sedang')) displayState = 'ACTIVE';

                              const getStatusColor = (state) => {
                                switch (state) {
                                  case 'ACTIVE': return 'bg-purple-100 text-purple-800 border-purple-200';
                                  default: return 'bg-amber-100 text-amber-800 border-amber-200';
                                }
                              };
                              
                              const getStatusText = (state) => {
                                switch (state) {
                                  case 'ACTIVE': return 'Sedang Menjawab';
                                  default: return 'Selesai Menjawab';
                                }
                              };

                              const getMarkahBadgeColor = (m: any) => {
                                if (m === undefined || m === null || isNaN(Number(m)) || m === '') return 'bg-slate-50 text-slate-400 border-slate-200';
                                const num = Number(m);
                                if (num >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold';
                                if (num >= 60) return 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
                                if (num >= 40) return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                                return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                              };

                              const displayScore = (score !== undefined && score !== null && score !== '') ? `${score}/100` : '-';

                              return (
                                <div key={`unmatched-student-${idx}`} className="p-3.5 border border-amber-200 rounded-xl flex items-center justify-between bg-amber-50/40 hover:shadow-md transition duration-200">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1.5">
                                      <span>{name}</span>
                                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Luar Kelas</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono truncate">{email}</div>
                                    <div className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(displayState)}`}>
                                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
                                      {getStatusText(displayState)}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right shrink-0 ml-2">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Markah</div>
                                    <div className={`mt-1 inline-block px-3 py-1 rounded-lg text-sm border ${getMarkahBadgeColor(score)}`}>
                                      {displayScore}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {filteredUnmatchedTeachers.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span>👩‍🏫</span>
                            <span>Guru / Pentadbir (Tidak Boleh Disemak) ({filteredUnmatchedTeachers.length})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            Akaun guru dikesan telah menjawab kuiz ini (mungkin semasa ujian). Akaun guru tidak boleh diberikan markah di dalam Google Classroom.
                          </div>
                          <div className="space-y-2.5">
                            {filteredUnmatchedTeachers.map((row, idx) => {
                              const name = row.nama || 'Guru Tanpa Nama';
                              const email = row.email || 'Tiada E-mel';
                              const score = row.markah;
                              const displayScore = (score !== undefined && score !== null && score !== '') ? `${score}/100` : '-';

                              return (
                                <div key={`unmatched-teacher-${idx}`} className="p-3.5 border border-blue-200 rounded-xl flex items-center justify-between bg-blue-50/40 transition duration-200">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1.5">
                                      <span>{name}</span>
                                      <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-200">Guru</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono truncate">{email}</div>
                                  </div>
                                  
                                  <div className="text-right shrink-0 ml-2">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Markah (Ujian)</div>
                                    <div className="mt-1 inline-block px-3 py-1 rounded-lg text-sm border bg-slate-50 text-slate-600 border-slate-200">
                                      {displayScore}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}
function BookOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
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
