
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Mendapatkan domain awam (Public Shared Origin) yang boleh diakses oleh sesiapa sahaja
 * tanpa memerlukan akaun Google pembina atau kelulusan dev.
 */
export function getPublicBaseOrigin(): string {
  if (typeof window === 'undefined') return '';
  let origin = window.location.origin;
  // Tukar persekitaran 'ais-dev-' kepada pautan kongsi awam 'ais-pre-'
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

/**
 * Membina pautan terus murid yang sah dan berfungsi 100% tanpa sebarang ralat.
 * Format: https://[domain_app]/?qid=SQ-0001&mod=umum
 */
export function buildDirectLink(
  qid: string,
  extraParams?: { kod?: string; kelas?: string; tugasan?: string; courseId?: string; courseWorkId?: string; mod?: string }
): string {
  const origin = getPublicBaseOrigin();
  const searchParams = new URLSearchParams();
  searchParams.set('qid', qid);
  if (extraParams?.kod) searchParams.set('kod', extraParams.kod);
  if (extraParams?.kelas) searchParams.set('kelas', extraParams.kelas);
  if (extraParams?.tugasan) searchParams.set('tugasan', extraParams.tugasan);
  if (extraParams?.courseId) searchParams.set('courseId', extraParams.courseId);
  if (extraParams?.courseWorkId) searchParams.set('courseWorkId', extraParams.courseWorkId);
  searchParams.set('mod', extraParams?.mod || (extraParams?.courseId ? 'gc' : 'umum'));

  return `${origin}/?${searchParams.toString()}`;
}

function chunkHtml(html: string): string[] {
  const MAX_CELL_LENGTH = 49000;
  if (!html) return [""];
  const chunks = [];
  for (let i = 0; i < html.length; i += MAX_CELL_LENGTH) {
    chunks.push(html.substring(i, i + MAX_CELL_LENGTH));
  }
  return chunks;
}


async function getSimulasiSheetName(token: string, spreadsheetId: string): Promise<string> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sheets) {
        const simulasiSheet = data.sheets.find((s: any) => s.properties.title.toLowerCase() === 'simulasi');
        if (simulasiSheet) {
          return simulasiSheet.properties.title;
        }
      }
    }
  } catch (e: any) {
    console.error('Error fetching sheet name:', e);
  }
  return 'SIMULASI'; // Fallback
}
async function getFirstSheetName(token: string, spreadsheetId: string): Promise<string> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      throw new Error('UNAUTHENTICATED');
    }
    if (res.ok) {
      const data = await res.json();
      if (data.sheets && data.sheets[0] && data.sheets[0].properties) {
        return data.sheets[0].properties.title;
      }
    }
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED') {
      throw e;
    }
    console.error('Error fetching sheet metadata:', e);
  }
  return 'Sheet1'; // Fallback
}

export async function saveQuestionToSheets(
  token: string, 
  data: { namaGuru: string, tingkatan: string, subjek: string, bab: string, sp: string, html: string },
  spreadsheetIdInput?: string,
  gasWebAppUrlInput?: string
) {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  const gasWebAppUrl = gasWebAppUrlInput || '';
  
  // Get the first sheet name dynamically
  const sheetName = await getFirstSheetName(token, spreadsheetId);
  
  // Create a localized timestamp
  const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  
    // Check if sheet is empty by trying to get A1:I1
  let isSheetEmpty = true;
  try {
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:I1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0) {
        isSheetEmpty = false;
      }
    }
  } catch (e) {
    console.error('Error checking if sheet is empty:', e);
  }
  
  // If empty, write the header row first. User should have formulas in H1 and I1, so we write headers A-G only.
  if (isSheetEmpty) {
    try {
      const headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:G1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${sheetName}!A1:G1`,
          majorDimension: 'ROWS',
          values: [
            ["Timestamp", "Nama Guru", "Tingkatan", "Subjek", "Bab", "SP", "CODE HTML"]
          ]
        })
      });
      if (!headerRes.ok) {
        console.warn('Failed to write header row:', await headerRes.text());
      }
    } catch (e) {
      console.error('Error writing header row:', e);
    }
  }
  
  // Append the question data (A-G only, so H and I are untouched for array formulas)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:G:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.subjek, data.bab, data.sp, chunkHtml(data.html)[0]]
      ]
    })
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Failed to save question to sheets');
  }

  const appendData = await res.json();
  const updatedRange = appendData.updates?.updatedRange;
  
  let idSoalan = "";
  let linkSoalan = "";
  
  // Fetch the row back to get the formula-generated ID and Link
  if (updatedRange) {
    // updatedRange looks like "Sheet1!A5:G5"
    const rowMatch = updatedRange.match(/\d+$/);
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[0], 10);
      
      // 1. Instant calculation ID Soalan
      idSoalan = `SQ-${String(rowNum - 1).padStart(4, '0')}`;
      
      // Gunakan pautan terus murid yang 100% sah dan berfungsi
      linkSoalan = buildDirectLink(idSoalan);

      // 2. Tulis terus ID Soalan (Lajur H) dan LINK SOALAN Direct (Lajur I) ke Google Sheets
      try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!H${rowNum}:I${rowNum}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `${sheetName}!H${rowNum}:I${rowNum}`,
            majorDimension: 'ROWS',
            values: [[idSoalan, linkSoalan]]
          })
        });
      } catch (err) {
        console.warn('Gagal menulis ID dan Link terus ke Sheet1:', err);
      }
    }
  }

  // Save to Firestore questions collection (both client-side & server endpoint)
  if (idSoalan) {
    try {
      await setDoc(doc(db, "questions", idSoalan), {
        idSoalan,
        namaGuru: data.namaGuru || "",
        tingkatan: data.tingkatan || "",
        subjek: data.subjek || "",
        bab: data.bab || "",
        sp: data.sp || "",
        html: data.html,
        linkSoalan,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (clientFsErr) {
      console.warn('Gagal simpan terus ke Firestore client SDK:', clientFsErr);
    }

    try {
      await fetch('/api/save-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idSoalan,
          namaGuru: data.namaGuru,
          tingkatan: data.tingkatan,
          subjek: data.subjek,
          bab: data.bab,
          sp: data.sp,
          html: data.html,
          linkSoalan
        })
      });
    } catch (e) {
      console.error('Gagal menyimpan soalan ke Firestore server:', e);
    }
  }
}


export async function saveSimulasiToSheets(
  token: string, 
  data: { namaGuru: string, tingkatan: string, bab: string, html: string },
  spreadsheetIdInput?: string
) {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  const sheetName = await getSimulasiSheetName(token, spreadsheetId);
  
  const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  
  let isSheetEmpty = true;
  try {
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:E1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0) {
        isSheetEmpty = false;
      }
    }
  } catch (e) {
    console.error('Error checking if sheet is empty:', e);
  }
  
  if (isSheetEmpty) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:E1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${sheetName}!A1:E1`,
          majorDimension: 'ROWS',
          values: [
            ["Timestamp", "Nama Guru", "Tingkatan", "Tajuk / Eksperimen", "CODE HTML"]
          ]
        })
      });
    } catch (e) {
      console.error('Error writing header row:', e);
    }
  }
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:E:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        [timestamp, data.namaGuru, data.tingkatan, data.bab, chunkHtml(data.html)[0], chunkHtml(data.html)[1] || ""]
      ]
    })
  });
  
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Gagal simpan ke sheets (Sila pastikan tab bernama "SIMULASI" wujud dan betul): ' + errorData);
  }
  
  // Save extra HTML chunks to column I onwards (to prevent overwriting G and H)
  const appendData = await res.json();
  const updatedRange = appendData.updates?.updatedRange;
  
  let idSimulasi = "";
  let linkSimulasi = "";

  if (updatedRange) {
    const rowMatch = updatedRange.match(/\d+$/);
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[0], 10);
      
      // Calculate ID and Link
      idSimulasi = `SS-${String(rowNum - 1).padStart(4, '0')}`;
      const defaultGasUrl = "https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec";
      linkSimulasi = `${defaultGasUrl}?sid=${idSimulasi}`;
      
      const chunks = chunkHtml(data.html);
      if (chunks.length > 2) {
        const extraChunks = chunks.slice(2);
        try {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!I${rowNum}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [extraChunks]
            })
          });
        } catch (e) {
          console.error("Failed to save extra HTML chunks for Simulasi:", e);
        }
      }
    }
  }
  
  return { success: true, idSimulasi, linkSimulasi };
}

export interface SoalanData {
  timestamp: string;
  namaGuru: string;
  tingkatan: string;
  subjek: string;
  bab: string;
  sp: string;
  html: string;
  idSoalan: string;
  linkSoalan: string;
}

export async function getQuestionsFromSheets(token: string, spreadsheetIdInput?: string): Promise<SoalanData[]> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  
  const sheetName = await getFirstSheetName(token, spreadsheetId);
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    const errorData = await res.text();
    console.error('Sheets API Error:', errorData);
    throw new Error('Failed to fetch questions from sheets');
  }

  const data = await res.json();
  const rows = data.values || [];
  
  if (rows.length === 0) return [];
  
  // Dynamically detect header row
  const firstRow = rows[0];
  const hasHeader = firstRow && firstRow[0] && (
    firstRow[0].toLowerCase().includes('time') || 
    firstRow[0].toLowerCase().includes('timestamp') || 
    firstRow[1].toLowerCase().includes('nama')
  );
  
  const startIdx = hasHeader ? 1 : 0;
  
  return rows.slice(startIdx).map((row: any[], idx: number) => {
    const rowNum = startIdx + idx + 1;
    const idSoalan = (row[7] || '').trim() || `SQ-${String(rowNum - 1).padStart(4, '0')}`;
    let linkSoalan = (row[8] || '').trim();
    
    // Pastikan sebarang link Google Script/GCS/Sites lama ditukarkan serta-merta kepada Direct Link!
    if (!linkSoalan || linkSoalan.includes('script.google.com') || linkSoalan.includes('storage.googleapis.com') || linkSoalan.includes('mod=sites') || !linkSoalan.startsWith('http')) {
      linkSoalan = buildDirectLink(idSoalan);
    }

    // Bina fullHtml daripada Lajur G (index 6) dan sebarang serpihan extra HTML dari Lajur J onwards (index 9)
    let fullHtml = row[6] || '';
    if (row.length > 9) {
      for (let i = 9; i < row.length; i++) {
        if (row[i]) fullHtml += row[i];
      }
    }

    const questionItem: SoalanData = {
      timestamp: row[0] || '',
      namaGuru: row[1] || '',
      tingkatan: row[2] || '',
      subjek: row[3] || '',
      bab: row[4] || '',
      sp: row[5] || '',
      html: fullHtml,
      idSoalan,
      linkSoalan
    };

    // Auto-sinkron ke Firestore client-side SDK dalam latar belakang
    if (idSoalan && fullHtml) {
      setDoc(doc(db, "questions", idSoalan), {
        idSoalan,
        namaGuru: questionItem.namaGuru,
        tingkatan: questionItem.tingkatan,
        subjek: questionItem.subjek,
        bab: questionItem.bab,
        sp: questionItem.sp,
        html: fullHtml,
        linkSoalan,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn(`[Auto-Sync] Ralat simpan ${idSoalan} ke Firestore:`, err);
      });
    }

    return questionItem;
  }).reverse(); // Reverse so newest is first
}

/**
 * Mengubah semua link soalan dalam tab Sheet1 (Lajur I) kepada Direct Link (${origin}/?qid=SQ-XXXX&mod=umum).
 * Mengemas kini Google Sheets dan pelayan / Firestore secara pukal.
 */
export async function convertAllSheet1LinksToDirect(
  token: string,
  spreadsheetIdInput?: string
): Promise<{ total: number; updated: number; message: string }> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  const sheetName = await getFirstSheetName(token, spreadsheetId);

  // 1. Ambil data sedia ada dari Sheet1 (A:Z)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    throw new Error('Gagal membaca data dari Sheet1');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length <= 1) {
    return { total: 0, updated: 0, message: 'Tiada soalan ditemui dalam Sheet1.' };
  }

  const firstRow = rows[0];
  const hasHeader = firstRow && firstRow[0] && (
    firstRow[0].toLowerCase().includes('time') || 
    firstRow[0].toLowerCase().includes('timestamp') || 
    firstRow[1]?.toLowerCase().includes('nama')
  );
  const startIdx = hasHeader ? 1 : 0;

  const linksColValues: string[][] = [];
  const updatedList: { id: string; link: string; html: string; guru: string; tingkatan: string; subjek: string; bab: string; sp: string }[] = [];
  let updatedCount = 0;

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const currentId = (row[7] || '').trim() || `SQ-${String(rowNum - 1).padStart(4, '0')}`;
    const currentLink = (row[8] || '').trim();

    // Jana Direct Link sistem
    const newDirectLink = buildDirectLink(currentId);

    if (currentLink !== newDirectLink || currentLink.includes('script.google.com') || currentLink.includes('storage.googleapis.com') || currentLink.includes('mod=sites')) {
      updatedCount++;
    }

    let fullHtml = row[6] || '';
    if (row.length > 9) {
      for (let j = 9; j < row.length; j++) {
        if (row[j]) fullHtml += row[j];
      }
    }

    linksColValues.push([newDirectLink]);
    updatedList.push({
      id: currentId,
      link: newDirectLink,
      html: fullHtml,
      guru: row[1] || '',
      tingkatan: row[2] || '',
      subjek: row[3] || '',
      bab: row[4] || '',
      sp: row[5] || ''
    });

    // Auto sync to Firestore
    if (currentId && fullHtml) {
      setDoc(doc(db, "questions", currentId), {
        idSoalan: currentId,
        namaGuru: row[1] || '',
        tingkatan: row[2] || '',
        subjek: row[3] || '',
        bab: row[4] || '',
        sp: row[5] || '',
        html: fullHtml,
        linkSoalan: newDirectLink,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }
  }

  // 2. Tulis balik semua Direct Link ke Lajur I dalam Sheet1
  const startRow = startIdx + 1;
  const endRow = startIdx + linksColValues.length;
  const targetRange = `${sheetName}!I${startRow}:I${endRow}`;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: targetRange,
        majorDimension: 'ROWS',
        values: linksColValues
      })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.warn('Amaran: Gagal menulis Direct Link ke Sheet1:', errText);
    throw new Error('Gagal mengemas kini lajur I di Google Sheets: ' + errText);
  }

  // 3. Kemas kini cache Firestore melalui endpoint pelayan secara serentak
  try {
    await Promise.all(
      updatedList.map(item =>
        fetch('/api/update-question-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idSoalan: item.id,
            linkSoalan: item.link,
            html: item.html,
            namaGuru: item.guru,
            tingkatan: item.tingkatan,
            subjek: item.subjek,
            bab: item.bab,
            sp: item.sp
          })
        }).catch(() => {})
      )
    );
  } catch (err) {
    console.warn('Ralat mengemas kini cache Firestore:', err);
  }

  return {
    total: linksColValues.length,
    updated: updatedCount,
    message: `Berjaya mengemas kini ${updatedCount} daripada ${linksColValues.length} pautan soalan ke Direct Link sistem!`
  };
}

export async function saveTugasanToSheets(
  token: string,
  spreadsheetId: string,
  className: string,
  qid: string,
  assignmentTitle: string,
  teacherName: string
): Promise<{ rowNum: number; uniqueCode: string } | null> {
  try {
    const uniqueCode = "TUG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const body = {
      values: [[className, qid, assignmentTitle, uniqueCode, teacherName]]
    };
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!A:E:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
      console.error('Failed to append tugasan', await res.text());
      return null;
    }
    const data = await res.json();
    const updatedRange = data.updates?.updatedRange; // e.g. TUGASAN!A5:E5
    if (updatedRange) {
      const match = updatedRange.match(/!A(\d+):/);
      if (match && match[1]) {
        return { rowNum: parseInt(match[1], 10), uniqueCode };
      }
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function readTugasanLink(
  token: string,
  spreadsheetId: string,
  rowNum: number
): Promise<string | null> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!F${rowNum}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.values && data.values[0] && data.values[0][0]) {
      return data.values[0][0];
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function updateTugasanStatus(
  token: string,
  spreadsheetId: string,
  rowNum: number,
  status: string,
  courseId: string,
  courseWorkId: string,
  linkTugasan?: string
): Promise<void> {
  try {
    if (linkTugasan) {
      // Update F, G & H (LinkTugasan, CourseId, CourseWorkId)
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!F${rowNum}:H${rowNum}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [[linkTugasan, courseId, courseWorkId]] })
      });
    } else {
      // Update G & H (CourseId, CourseWorkId)
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!G${rowNum}:H${rowNum}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [[courseId, courseWorkId]] })
      });
    }
  } catch (err) {
    console.error('Error updating tugasan status:', err);
  }
}

export async function getTugasanRows(token: string, spreadsheetId: string): Promise<any[]> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!A:H`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.values || [];
  } catch (err) {
    return [];
  }
}

export async function syncSubmissionsToSheets(token: string, submissions: any[], spreadsheetIdInput?: string): Promise<boolean> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  try {
    // 1. Get all sheet names
    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metadataRes.ok) {
      if (metadataRes.status === 401) {
        throw new Error('UNAUTHENTICATED');
      }
      throw new Error('Failed to fetch spreadsheet metadata');
    }
    const metadata = await metadataRes.json();
    const sheetTitles: string[] = metadata.sheets?.map((s: any) => s.properties.title) || [];

    // 2. Create "Markah Murid" sheet if it does not exist
    if (!sheetTitles.includes('Markah Murid')) {
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Markah Murid'
                }
              }
            }
          ]
        })
      });
      if (!createRes.ok) {
        console.error('Failed to create Markah Murid sheet:', await createRes.text());
        return false;
      }
    }

    // 3. Prepare data rows
    const headerRow = ["Waktu Menjawab", "ID Soalan", "Nama Murid", "Email Murid", "Markah (%)", "Status"];
    const dataRows = submissions.map(sub => [
      sub.updatedAt || '',
      sub.qid || '',
      sub.nama || '',
      sub.email || '',
      sub.markah !== undefined && sub.markah !== null ? `${sub.markah}%` : '-',
      sub.status || ''
    ]);
    const values = [headerRow, ...dataRows];

    // 4. Overwrite "Markah Murid" A:F with updated values
    // Clear the existing contents in the sheet first
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Markah%20Murid!A:F:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Markah%20Murid!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: 'Markah Murid!A1',
        majorDimension: 'ROWS',
        values
      })
    });

    if (!updateRes.ok) {
      console.error('Failed to update Markah Murid values:', await updateRes.text());
      return false;
    }

    return true;
  } catch (err: any) {
    if (err && err.message === 'UNAUTHENTICATED') {
      console.warn('Authentication token expired during score synchronization');
    } else {
      console.error('Error syncing submissions to sheets:', err);
    }
    return false;
  }
}

export async function getMarkahMurid(token: string, spreadsheetIdInput?: string): Promise<any[]> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Markah%20Murid!A:J`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
      console.warn('Markah Murid sheet may not exist or error fetching it.');
      return [];
    }
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length <= 1) return []; // Only header or empty
    
    // Dynamic mapping to support both:
    // Old: ["Waktu Menjawab", "ID Soalan", "Nama Murid", "Email Murid", "Markah (%)", "Status"] (6 cols)
    // New: ["Waktu Menjawab", "ID Soalan", "Nama Murid", "Email Murid", "Kelas", "Tugasan", "Markah (%)", "Status", "Status Sync GC", "Kod Unik"] (10 cols)
    return rows.slice(1).map(row => {
      if (row.length >= 8) {
        return {
          timestamp: row[0] || '',
          qid: row[1] || '',
          nama: row[2] || '',
          email: row[3] || '',
          kelas: row[4] || '',
          tugasan: row[5] || '',
          markah: row[6] ? parseInt(row[6].toString().replace('%', '')) : undefined,
          status: row[7] || '',
          syncStatus: row[8] || '',
          kodUnik: row[9] || ''
        };
      } else {
        return {
          timestamp: row[0] || '',
          qid: row[1] || '',
          nama: row[2] || '',
          email: row[3] || '',
          kelas: 'Tiada Kelas',
          tugasan: 'Tiada Tugasan',
          markah: row[4] ? parseInt(row[4].toString().replace('%', '')) : undefined,
          status: row[5] || '',
          syncStatus: '',
          kodUnik: ''
        };
      }
    });
  } catch (err) {
    console.error('Error fetching Markah Murid:', err);
    return [];
  }
}

export async function getDataWayground(token: string, spreadsheetIdInput?: string): Promise<any[]> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Data%20Wayground!A:F`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHENTICATED');
      console.warn('Data Wayground sheet may not exist or error fetching it.');
      return [];
    }
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length <= 1) return []; // Only header or empty
    
    return rows.slice(1).map(row => ({
      timestamp: row[0] || '',
      namaKelas: row[1] || '',
      namaTugasan: row[2] || '',
      namaPelajar: row[3] || '',
      email: row.length >= 6 ? (row[4] || '') : '',
      markah: row.length >= 6 
        ? (row[5] ? parseFloat(row[5].toString().replace('%', '')) : undefined) 
        : (row[4] ? parseFloat(row[4].toString().replace('%', '')) : undefined)
    }));
  } catch (err) {
    console.error('Error fetching Data Wayground:', err);
    return [];
  }
}

export async function deleteScoresOnlyFromSheets(
  token: string,
  spreadsheetId: string,
  qid: string,
  courseId?: string,
  courseWorkId?: string
): Promise<boolean> {
  try {
    const tugRows = await getTugasanRows(token, spreadsheetId);
    if (!tugRows || tugRows.length === 0) return false;

    const uniqueCodesToDelete: string[] = [];

    for (let i = 0; i < tugRows.length; i++) {
      const row = tugRows[i];
      const rowQid = (row[1] || '').toString().toUpperCase().trim();
      const rowKodUnik = (row[3] || '').toString().toUpperCase().trim();
      const rowCourseId = (row[6] || '').toString().trim();
      const rowCourseWorkId = (row[7] || '').toString().trim();

      let matches = false;
      if (courseId && courseWorkId) {
        if (rowQid === qid.toUpperCase().trim() && rowCourseId === courseId.toString().trim() && rowCourseWorkId === courseWorkId.toString().trim()) {
          matches = true;
        }
      } else if (courseId) {
        if (rowQid === qid.toUpperCase().trim() && rowCourseId === courseId.toString().trim()) {
          matches = true;
        }
      } else {
        if (rowQid === qid.toUpperCase().trim()) {
          matches = true;
        }
      }

      if (matches && rowKodUnik) {
        uniqueCodesToDelete.push(rowKodUnik);
      }
    }

    if (uniqueCodesToDelete.length === 0) return false;

    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,sheets.properties.sheetId`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metadataRes.ok) return false;
    
    const metadata = await metadataRes.json();
    const markahSheetMeta = (metadata.sheets || []).find((s: any) => s.properties.title === 'Markah Murid');
    if (!markahSheetMeta) return false;

    const requests: any[] = [];
    const mmRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Markah%20Murid!A:J`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      const mmRows = mmData.values || [];
      const mmRowsToDeleteIndices: number[] = [];

      for (let i = 0; i < mmRows.length; i++) {
        const row = mmRows[i];
        const rowKodUnik = (row[9] || '').toString().toUpperCase().trim();
        if (rowKodUnik && uniqueCodesToDelete.includes(rowKodUnik)) {
          mmRowsToDeleteIndices.push(i + 1);
        }
      }

      if (mmRowsToDeleteIndices.length > 0) {
        const mmSheetId = markahSheetMeta.properties.sheetId;
        const sortedMMIndicesDesc = [...mmRowsToDeleteIndices].sort((a, b) => b - a);
        for (const rowIndex of sortedMMIndicesDesc) {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: mmSheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          });
        }
      }
    }

    if (requests.length > 0) {
      const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
         },
         body: JSON.stringify({ requests })
      });
      return batchRes.ok;
    }

    return true;
  } catch (err) {
    return false;
  }
}

export interface DeleteClassroomAssignmentOptions {
  courseId?: string;
  courseWorkId?: string;
  qid?: string;
  kod?: string;
  assignmentTitle?: string;
  className?: string;
}

export async function deleteClassroomAssignmentAndMarksFromSheets(
  token: string,
  spreadsheetId: string,
  options: DeleteClassroomAssignmentOptions
): Promise<{ success: boolean; deletedTugasanCount: number; deletedMarkahCount: number; message?: string }> {
  try {
    const cleanCourseId = (options.courseId || '').trim();
    const cleanCourseWorkId = (options.courseWorkId || '').trim();
    const cleanQid = (options.qid || '').trim().toUpperCase();
    const cleanKod = (options.kod || '').trim().toUpperCase();
    const cleanTitle = (options.assignmentTitle || '').trim().toUpperCase();
    const cleanClassName = (options.className || '').trim().toUpperCase();

    // 1. Dapatkan Metadata Spreadsheet untuk mencari sheetId bagi tab TUGASAN, Markah Murid, dan TUGASAN UMUM
    const metadataRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metadataRes.ok) {
      const errText = await metadataRes.text();
      console.error("Gagal mendapatkan metadata spreadsheet:", errText);
      return { success: false, deletedTugasanCount: 0, deletedMarkahCount: 0, message: errText };
    }
    const metadata = await metadataRes.json();
    const sheetsMeta: any[] = metadata.sheets || [];

    const tugasanMeta = sheetsMeta.find(s => (s.properties?.title || '').trim().toUpperCase() === 'TUGASAN');
    const markahMeta = sheetsMeta.find(s => (s.properties?.title || '').trim().toLowerCase() === 'markah murid');
    const umumMeta = sheetsMeta.find(s => {
      const t = (s.properties?.title || '').trim().toUpperCase();
      return t === 'TUGASAN UMUM' || t === 'TUGASAN_UMUM';
    });

    const requests: any[] = [];
    const uniqueCodesToDelete = new Set<string>();
    if (cleanKod) uniqueCodesToDelete.add(cleanKod);
    if (cleanCourseWorkId) {
      uniqueCodesToDelete.add(cleanCourseWorkId);
      uniqueCodesToDelete.add(`WG-${cleanCourseWorkId}`);
    }

    let deletedTugasanCount = 0;
    let deletedMarkahCount = 0;

    // 2. Semak tab TUGASAN dan cari semua baris yang sepadan
    if (tugasanMeta && tugasanMeta.properties?.sheetId !== undefined) {
      const tugTitle = tugasanMeta.properties.title;
      const tugSheetId = tugasanMeta.properties.sheetId;

      const tRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${tugTitle}'!A:H`)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (tRes.ok) {
        const tData = await tRes.json();
        const rows: any[][] = tData.values || [];
        const tugIndicesDesc: number[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowClass = (row[0] || '').toString().trim().toUpperCase();
          const rowQid = (row[1] || '').toString().trim().toUpperCase();
          const rowTitle = (row[2] || '').toString().trim().toUpperCase();
          const rowKod = (row[3] || '').toString().trim().toUpperCase();
          const rowCourseId = (row[6] || '').toString().trim();
          const rowCourseWorkId = (row[7] || '').toString().trim();

          let matches = false;

          // Padanan tepat CourseWorkId
          if (cleanCourseWorkId && rowCourseWorkId === cleanCourseWorkId) {
            matches = true;
          }
          // Padanan CourseId & CourseWorkId
          else if (cleanCourseId && cleanCourseWorkId && rowCourseId === cleanCourseId && rowCourseWorkId === cleanCourseWorkId) {
            matches = true;
          }
          // Padanan Kod Unik
          else if (cleanKod && rowKod === cleanKod) {
            matches = true;
          }
          // Padanan CourseId + QID
          else if (cleanCourseId && cleanQid && rowCourseId === cleanCourseId && rowQid === cleanQid) {
            matches = true;
          }
          // Padanan CourseId + Tajuk Tugasan
          else if (cleanCourseId && cleanTitle && rowCourseId === cleanCourseId && (rowTitle === cleanTitle || rowTitle.includes(cleanTitle))) {
            matches = true;
          }
          // Padanan Nama Kelas + Tajuk Tugasan
          else if (cleanClassName && cleanTitle && rowClass === cleanClassName && (rowTitle === cleanTitle || rowTitle.includes(cleanTitle))) {
            matches = true;
          }

          if (matches) {
            tugIndicesDesc.push(i); // 0-indexed row index
            if (rowKod) uniqueCodesToDelete.add(rowKod);
          }
        }

        // Susun secara menurun supaya pemadaman baris tidak mengubah indeks seterusnya
        tugIndicesDesc.sort((a, b) => b - a).forEach(rowIndex => {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: tugSheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          });
          deletedTugasanCount++;
        });
      }
    }

    // 3. Semak tab "Markah Murid" dan cari SEMUA markah pelajar yang sepadan
    if (markahMeta && markahMeta.properties?.sheetId !== undefined) {
      const mmTitle = markahMeta.properties.title;
      const mmSheetId = markahMeta.properties.sheetId;

      const mmRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${mmTitle}'!A:J`)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (mmRes.ok) {
        const mmData = await mmRes.json();
        const mmRows: any[][] = mmData.values || [];
        const mmIndicesDesc: number[] = [];

        for (let i = 1; i < mmRows.length; i++) {
          const row = mmRows[i];
          const rowQid = (row[1] || '').toString().trim().toUpperCase();
          const rowKelas = (row[4] || '').toString().trim().toUpperCase();
          const rowTugasan = (row[5] || '').toString().trim().toUpperCase();
          const rowKodUnik = (row[9] || '').toString().trim().toUpperCase();

          let matches = false;

          // 1. Padanan melalui kod unik yang dikumpul daripada tugasan
          if (rowKodUnik) {
            for (const code of uniqueCodesToDelete) {
              if (rowKodUnik === code || rowKodUnik.includes(code)) {
                matches = true;
                break;
              }
            }
          }

          // 2. Padanan tepat melalui courseWorkId dalam lajur tugasan atau kod unik
          if (!matches && cleanCourseWorkId) {
            if (rowKodUnik === cleanCourseWorkId || rowKodUnik === `WG-${cleanCourseWorkId}` || rowTugasan.includes(cleanCourseWorkId)) {
              matches = true;
            }
          }

          // 3. Padanan Tajuk Tugasan (+ Kelas jika ada)
          if (!matches && cleanTitle) {
            const titleMatches = (rowTugasan === cleanTitle || rowTugasan.includes(cleanTitle) || cleanTitle.includes(rowTugasan));
            if (titleMatches) {
              if (cleanClassName) {
                if (rowKelas === cleanClassName || rowKelas.includes(cleanClassName) || cleanClassName.includes(rowKelas)) {
                  matches = true;
                }
              } else {
                matches = true;
              }
            }
          }

          // 4. Padanan QID (+ Kelas jika ada)
          if (!matches && cleanQid && rowQid === cleanQid) {
            if (cleanClassName) {
              if (rowKelas === cleanClassName || rowKelas.includes(cleanClassName) || cleanClassName.includes(rowKelas)) {
                matches = true;
              }
            }
          }

          if (matches) {
            mmIndicesDesc.push(i);
          }
        }

        // Susun secara menurun
        mmIndicesDesc.sort((a, b) => b - a).forEach(rowIndex => {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: mmSheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          });
          deletedMarkahCount++;
        });
      }
    }

    // 4. Semak juga tab TUGASAN UMUM jika kod berkenaan tercatat di sana
    if (umumMeta && umumMeta.properties?.sheetId !== undefined && uniqueCodesToDelete.size > 0) {
      const uTitle = umumMeta.properties.title;
      const uSheetId = umumMeta.properties.sheetId;

      const uRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${uTitle}'!A:E`)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (uRes.ok) {
        const uData = await uRes.json();
        const uRows: any[][] = uData.values || [];
        const uIndicesDesc: number[] = [];

        for (let i = 1; i < uRows.length; i++) {
          const rowKod = (uRows[i][0] || '').toString().trim().toUpperCase();
          if (rowKod && uniqueCodesToDelete.has(rowKod)) {
            uIndicesDesc.push(i);
          }
        }

        uIndicesDesc.sort((a, b) => b - a).forEach(rowIndex => {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: uSheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          });
        });
      }
    }

    // 5. Jalankan batchUpdate jika ada baris untuk dipadam
    if (requests.length > 0) {
      const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        console.error("Gagal melakukan batchUpdate padam baris di Google Sheets:", errText);
        return { success: false, deletedTugasanCount, deletedMarkahCount, message: errText };
      }
    }

    return {
      success: true,
      deletedTugasanCount,
      deletedMarkahCount,
      message: `Berjaya memadam ${deletedTugasanCount} baris rekod tugasan dan ${deletedMarkahCount} rekod markah murid dari Google Sheets.`
    };
  } catch (err: any) {
    console.error("Ralat dalam deleteClassroomAssignmentAndMarksFromSheets:", err);
    return {
      success: false,
      deletedTugasanCount: 0,
      deletedMarkahCount: 0,
      message: err?.message || 'Ralat semasa memadam dari Google Sheets'
    };
  }
}

export async function deleteTugasanAndScoresFromSheets(
  token: string,
  spreadsheetId: string,
  qid: string,
  courseId?: string,
  courseWorkId?: string
): Promise<boolean> {
  const result = await deleteClassroomAssignmentAndMarksFromSheets(token, spreadsheetId, {
    qid,
    courseId,
    courseWorkId
  });
  return result.success;
}


export interface SimulasiData {
  timestamp: string;
  namaGuru: string;
  tingkatan: string;
  bab: string;
  html: string;
  idSimulasi?: string;
  linkSimulasi?: string;
}

export async function getSimulasiFromSheets(token: string, spreadsheetIdInput?: string): Promise<SimulasiData[]> {
  const spreadsheetId = spreadsheetIdInput || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
  const sheetName = await getSimulasiSheetName(token, spreadsheetId);
  
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHENTICATED');
      console.error('Failed to fetch simulasi from sheets');
      return [];
    }

    const data = await res.json();
    const rows = data.values || [];
    
    if (rows.length === 0) return [];
    
    // Dynamically detect header row
    const firstRow = rows[0];
    const hasHeader = firstRow && firstRow[0] && (
      firstRow[0].toLowerCase().includes('time') || 
      firstRow[0].toLowerCase().includes('timestamp') || 
      firstRow[1].toLowerCase().includes('nama')
    );
    
    const startIdx = hasHeader ? 1 : 0;
    
    return rows.slice(startIdx).map((row: any[]) => {
      // Index 4=E, 5=F are HTML. Index 6=G (ID), 7=H (Link) are metadata. Index 8=I onwards are extra HTML chunks.
      let fullHtml = (row[4] || '') + (row[5] || '');
      if (row.length > 8) {
        for (let i = 8; i < row.length; i++) {
          if (row[i]) fullHtml += row[i];
        }
      }
      return {
        timestamp: row[0] || '',
        namaGuru: row[1] || '',
        tingkatan: row[2] || '',
        bab: row[3] || '',
        html: fullHtml,
        idSimulasi: row[6] || '',
        linkSimulasi: row[7] || ''
      };
    }).filter((sim: SimulasiData) => sim.html && sim.html.trim() !== '');
  } catch (err) {
    console.error('Error in getSimulasiFromSheets:', err);
    return [];
  }
}


export async function deleteQuestionFromSheets(
  token: string,
  spreadsheetId: string,
  idSoalan: string
): Promise<boolean> {
  try {
    const sheetName = await getFirstSheetName(token, spreadsheetId);
    
    // 1. Get all rows to find the index
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:H`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    const rows = data.values || [];
    let rowIndexToDelete = -1;
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][7] === idSoalan) { // Index 7 is idSoalan
        rowIndexToDelete = i;
        break;
      }
    }
    
    if (rowIndexToDelete === -1) return false;
    
    // 2. Get sheetId for the sheetName
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const metaData = await metaRes.json();
    const sheetId = metaData.sheets.find((s: any) => s.properties.title === sheetName)?.properties.sheetId;
    
    if (sheetId === undefined) return false;
    
    // 3. Delete the row
    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndexToDelete,
                endIndex: rowIndexToDelete + 1
              }
            }
          }
        ]
      })
    });
    
    return batchRes.ok;
  } catch (err) {
    console.error("Error deleting question:", err);
    return false;
  }
}

export async function updateQuestionMetaInSheets(
  token: string,
  spreadsheetId: string,
  idSoalan: string,
  subjek: string,
  bab: string,
  sp: string
): Promise<boolean> {
  try {
    const sheetName = await getFirstSheetName(token, spreadsheetId);
    
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:H`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    const rows = data.values || [];
    let rowIndexToUpdate = -1;
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][7] === idSoalan) { // Index 7 is idSoalan
        rowIndexToUpdate = i + 1; // 1-indexed for A1 notation
        break;
      }
    }
    
    if (rowIndexToUpdate === -1) return false;
    
    // Update D, E, F columns (Subjek, Bab, SP) -> Index 3, 4, 5
    const range = `${sheetName}!D${rowIndexToUpdate}:F${rowIndexToUpdate}`;
    
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          [subjek, bab, sp]
        ]
      })
    });
    
    return updateRes.ok;
  } catch (err) {
    console.error("Error updating question:", err);
    return false;
  }
}

/**
 * Memastikan tab "TUGASAN UMUM" wujud dalam Google Spreadsheet.
 * Struktur lajur tab TUGASAN UMUM:
 * 1. Kod Tugasan (cth: TU-2Q5VB)
 * 2. ID Soalan (cth: SQ-0827)
 * 3. Kelas (cth: 1 ABU BAKAR)
 * 4. Link tugasan umum
 * 5. Nama Guru (cth: MEGAT CHAIREL ASHMAN)
 */
export async function ensureTugasanUmumSheet(token: string, spreadsheetId: string): Promise<boolean> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) return false;
    const meta = await metaRes.json();
    const sheets = meta.sheets || [];
    const sheetObj = sheets.find((s: any) => (s.properties?.title || '').trim().toUpperCase() === 'TUGASAN UMUM');

    if (!sheetObj) {
      // Cipta tab baru "TUGASAN UMUM"
      const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'TUGASAN UMUM'
                }
              }
            }
          ]
        })
      });
      if (!addRes.ok) {
        console.warn('Gagal menambah helaian TUGASAN UMUM:', await addRes.text());
        return false;
      }
    }

    // Pastikan baris tajuk A1:E1 tepat mengikut spesifikasi 5 lajur:
    // ["Kod Tugasan", "ID Soalan", "Kelas", "Link tugasan umum", "Nama Guru"]
    const expectedHeaders = ["Kod Tugasan", "ID Soalan", "Kelas", "Link tugasan umum", "Nama Guru"];
    const headRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN%20UMUM!A1:E1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let needUpdateHeaders = true;
    if (headRes.ok) {
      const headData = await headRes.json();
      if (
        headData.values && 
        headData.values.length > 0 && 
        headData.values[0][0] === expectedHeaders[0] &&
        headData.values[0][1] === expectedHeaders[1] &&
        headData.values[0][2] === expectedHeaders[2] &&
        headData.values[0][3] === expectedHeaders[3] &&
        headData.values[0][4] === expectedHeaders[4]
      ) {
        needUpdateHeaders = false;
      }
    }

    if (needUpdateHeaders) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN%20UMUM!A1:E1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'TUGASAN UMUM!A1:E1',
          majorDimension: 'ROWS',
          values: [expectedHeaders]
        })
      });
    }

    return true;
  } catch (err) {
    console.error('Error ensuring TUGASAN UMUM sheet:', err);
    return false;
  }
}

/**
 * Menyimpan atau mengemaskini maklumat pautan tugasan umum ke tab "TUGASAN UMUM"
 * Lajur: [Kod Tugasan, ID Soalan, Kelas, Link tugasan umum, Nama Guru]
 */
export async function saveTugasanUmumRowToSheet(
  token: string,
  spreadsheetId: string,
  data: {
    kod: string;
    qid: string;
    kelas: string;
    link: string;
    namaGuru?: string;
  }
): Promise<boolean> {
  try {
    await ensureTugasanUmumSheet(token, spreadsheetId);
    const cleanKod = String(data.kod || '').trim().toUpperCase();
    const cleanQid = String(data.qid || '').trim().toUpperCase();
    const cleanKelas = String(data.kelas || '').trim().toUpperCase();
    const cleanLink = String(data.link || '').trim();
    const cleanNamaGuru = String(data.namaGuru || '').trim();

    if (!cleanKod) return false;

    // Dapatkan data sedia ada untuk semak jika kod sudah ada
    const readRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN%20UMUM!A:E`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    let targetRow = -1;
    if (readRes.ok) {
      const readData = await readRes.json();
      const rows = readData.values || [];
      for (let i = 1; i < rows.length; i++) {
        const rowKod = String(rows[i][0] || '').trim().toUpperCase();
        if (rowKod === cleanKod) {
          targetRow = i + 1;
          break;
        }
      }
    }

    const rowValues = [cleanKod, cleanQid, cleanKelas, cleanLink, cleanNamaGuru];

    if (targetRow !== -1) {
      // Kemaskini baris sedia ada
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN%20UMUM!A${targetRow}:E${targetRow}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `TUGASAN UMUM!A${targetRow}:E${targetRow}`,
          majorDimension: 'ROWS',
          values: [rowValues]
        })
      });
      return updateRes.ok;
    } else {
      // Tambah baris baru
      const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN%20UMUM!A:E:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });
      return appendRes.ok;
    }
  } catch (err) {
    console.error('Error saving row to TUGASAN UMUM sheet:', err);
    return false;
  }
}

/**
 * Membaca senarai tugasan umum daripada tab "TUGASAN UMUM"
 * Pulangan: [{ kod, qid, kelas, link, namaGuru, rowNumber }]
 */
export async function getTugasanUmumRowsFromSheet(
  token: string,
  spreadsheetId: string
): Promise<{ kod: string; qid: string; kelas: string; link: string; namaGuru: string; rowNumber: number }[]> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN%20UMUM!A:E`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row: any[], idx: number) => ({
      rowNumber: idx + 2,
      kod: (row[0] || '').toString().trim().toUpperCase(),
      qid: (row[1] || '').toString().trim().toUpperCase(),
      kelas: (row[2] || '').toString().trim().toUpperCase(),
      link: (row[3] || '').toString().trim(),
      namaGuru: (row[4] || '').toString().trim()
    })).filter((item: any) => item.kod || item.qid);
  } catch (err) {
    console.error('Error fetching rows from TUGASAN UMUM sheet:', err);
    return [];
  }
}

/**
 * Memadam baris tugasan umum daripada tab "TUGASAN UMUM" dan rekod markah murid
 * yang berkaitan dalam tab "Markah Murid" mengikut Kod Tugasan (cth: TU-XXXXX).
 */
export async function deleteTugasanUmumRowFromSheet(
  token: string | null | undefined,
  spreadsheetId: string | null | undefined,
  kod: string,
  extra?: { qid?: string; kelas?: string; tajuk?: string }
): Promise<{ success: boolean; deletedUmumCount: number; deletedMarkahCount: number; message?: string }> {
  try {
    const cleanKod = (kod || '').trim().toUpperCase();
    const cleanExtraQid = (extra?.qid || '').trim().toUpperCase();
    const cleanExtraKelas = (extra?.kelas || '').trim().toUpperCase();
    const cleanExtraTajuk = (extra?.tajuk || '').trim().toUpperCase();

    if (!cleanKod && !cleanExtraQid) {
      return { success: false, deletedUmumCount: 0, deletedMarkahCount: 0, message: "Kod tugasan tidak sah." };
    }

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null);
    const activeSheetId = spreadsheetId || (typeof window !== 'undefined' ? localStorage.getItem('smkj_spreadsheet_id') : null) || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';

    if (!activeToken || !activeSheetId) {
      console.warn("deleteTugasanUmumRowFromSheet: Tiada token aktif atau spreadsheetId.");
      return { success: false, deletedUmumCount: 0, deletedMarkahCount: 0, message: "Tiada token Google atau ID Spreadsheet." };
    }

    // 1. Dapatkan Metadata Spreadsheet untuk mencari sheetId bagi tab TUGASAN UMUM dan Markah Murid
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}?fields=sheets.properties(title,sheetId)`,
      { headers: { Authorization: `Bearer ${activeToken}` } }
    );
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      console.error("Gagal membaca metadata spreadsheet untuk pemadaman:", errText);
      return { success: false, deletedUmumCount: 0, deletedMarkahCount: 0, message: errText };
    }

    const meta = await metaRes.json();
    const sheetsList = meta.sheets || [];

    const umumSheet = sheetsList.find((s: any) => {
      const t = (s.properties?.title || '').trim().toUpperCase();
      return t === 'TUGASAN UMUM' || t === 'TUGASAN_UMUM';
    });

    const markahSheet = sheetsList.find((s: any) => {
      const t = (s.properties?.title || '').trim().toLowerCase();
      return t === 'markah murid' || t === 'markah_murid';
    });

    const tugasanRegularSheet = sheetsList.find((s: any) => {
      const t = (s.properties?.title || '').trim().toUpperCase();
      return t === 'TUGASAN';
    });

    const requests: any[] = [];
    let deletedUmumCount = 0;
    let deletedMarkahCount = 0;

    // 2. Semak tab "TUGASAN UMUM" dan kumpul semua baris yang sepadan
    if (umumSheet && umumSheet.properties?.sheetId !== undefined) {
      const umumTitle = umumSheet.properties.title;
      const umumSheetId = umumSheet.properties.sheetId;

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(`'${umumTitle}'!A:E`)}`,
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );

      if (res.ok) {
        const data = await res.json();
        const rows = data.values || [];
        const umumIndices: number[] = [];

        for (let i = 1; i < rows.length; i++) {
          const rowKod = (rows[i][0] || '').toString().trim().toUpperCase();
          const rowQid = (rows[i][1] || '').toString().trim().toUpperCase();
          const rowKelas = (rows[i][2] || '').toString().trim().toUpperCase();

          let match = false;
          if (cleanKod && rowKod === cleanKod) match = true;
          else if (cleanExtraQid && rowQid === cleanExtraQid && cleanExtraKelas && rowKelas === cleanExtraKelas) match = true;

          if (match) {
            umumIndices.push(i);
          }
        }

        // Susun secara menurun supaya indeks baris tidak berubah semasa pemadaman
        umumIndices.sort((a, b) => b - a).forEach(rowIndex => {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: umumSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          });
          deletedUmumCount++;
        });
      }
    }

    // 3. Semak tab "Markah Murid" dan padam rekod markah murid bagi kod tugasan ini
    if (markahSheet && markahSheet.properties?.sheetId !== undefined) {
      const markahTitle = markahSheet.properties.title;
      const markahSheetId = markahSheet.properties.sheetId;

      const mmRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(`'${markahTitle}'!A:J`)}`,
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );

      if (mmRes.ok) {
        const mmData = await mmRes.json();
        const mmRows = mmData.values || [];
        const markahIndices: number[] = [];

        for (let i = 1; i < mmRows.length; i++) {
          const row = mmRows[i];
          const rowQid = (row[1] || '').toString().trim().toUpperCase();
          const rowKelas = (row[4] || '').toString().trim().toUpperCase();
          const rowTugasan = (row[5] || '').toString().trim().toUpperCase();
          const rowKodUnik = (row[9] || '').toString().trim().toUpperCase();

          let match = false;
          if (cleanKod && (rowKodUnik === cleanKod || rowKodUnik.includes(cleanKod) || rowTugasan.includes(cleanKod))) {
            match = true;
          } else if (cleanExtraQid && rowQid === cleanExtraQid) {
            if (cleanExtraKelas) {
              if (rowKelas === cleanExtraKelas || rowKelas.includes(cleanExtraKelas) || cleanExtraKelas.includes(rowKelas)) match = true;
            } else {
              match = true;
            }
          } else if (cleanExtraTajuk && (rowTugasan === cleanExtraTajuk || rowTugasan.includes(cleanExtraTajuk))) {
            if (cleanExtraKelas) {
              if (rowKelas === cleanExtraKelas || rowKelas.includes(cleanExtraKelas) || cleanExtraKelas.includes(rowKelas)) match = true;
            } else {
              match = true;
            }
          }

          if (match) {
            markahIndices.push(i);
          }
        }

        markahIndices.sort((a, b) => b - a).forEach(rowIndex => {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: markahSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          });
          deletedMarkahCount++;
        });
      }
    }

    // 4. Semak tab "TUGASAN" (jika kod unik tercatat di sana)
    if (tugasanRegularSheet && tugasanRegularSheet.properties?.sheetId !== undefined) {
      const tugTitle = tugasanRegularSheet.properties.title;
      const tugSheetId = tugasanRegularSheet.properties.sheetId;

      const tRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(`'${tugTitle}'!A:D`)}`,
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );

      if (tRes.ok) {
        const tData = await tRes.json();
        const tRows = tData.values || [];
        const tIndices: number[] = [];

        for (let i = 1; i < tRows.length; i++) {
          const rowKodUnik = (tRows[i][3] || '').toString().trim().toUpperCase();
          const rowQid = (tRows[i][1] || '').toString().trim().toUpperCase();
          const rowKelas = (tRows[i][0] || '').toString().trim().toUpperCase();

          let match = false;
          if (cleanKod && rowKodUnik === cleanKod) match = true;
          else if (cleanExtraQid && rowQid === cleanExtraQid && cleanExtraKelas && rowKelas === cleanExtraKelas) match = true;

          if (match) {
            tIndices.push(i);
          }
        }

        tIndices.sort((a, b) => b - a).forEach(rowIndex => {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: tugSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          });
        });
      }
    }

    // 5. Jalankan batchUpdate jika ada baris untuk dipadam
    if (requests.length > 0) {
      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests })
        }
      );

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        console.error('Gagal memadam baris dari Google Sheets batchUpdate:', errText);
        return { success: false, deletedUmumCount, deletedMarkahCount, message: errText };
      }
    }

    return {
      success: true,
      deletedUmumCount,
      deletedMarkahCount,
      message: `Berjaya memadam ${deletedUmumCount} baris tugasan umum dan ${deletedMarkahCount} rekod markah dari Google Sheets.`
    };
  } catch (err: any) {
    console.error('Error deleting row from TUGASAN UMUM / Markah Murid sheet:', err);
    return {
      success: false,
      deletedUmumCount: 0,
      deletedMarkahCount: 0,
      message: err?.message || 'Ralat semasa memadam dari Google Sheets'
    };
  }
}

/**
 * Memadam baris rekod markah murid tertentu dari tab "Markah Murid"
 */
export async function deleteSingleMarkahMuridRowFromSheet(
  token: string | null | undefined,
  spreadsheetId: string | null | undefined,
  target: {
    nama: string;
    kod?: string;
    qid?: string;
  }
): Promise<boolean> {
  try {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null);
    const activeSheetId = spreadsheetId || (typeof window !== 'undefined' ? localStorage.getItem('smkj_spreadsheet_id') : null) || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';

    if (!activeToken || !activeSheetId) return false;

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}?fields=sheets.properties(title,sheetId)`,
      { headers: { Authorization: `Bearer ${activeToken}` } }
    );
    if (!metaRes.ok) return false;
    const meta = await metaRes.json();
    const markahSheet = (meta.sheets || []).find((s: any) => (s.properties?.title || '').trim().toLowerCase() === 'markah murid');
    if (!markahSheet || markahSheet.properties?.sheetId === undefined) return false;

    const sheetId = markahSheet.properties.sheetId;
    const title = markahSheet.properties.title;

    const mmRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(`'${title}'!A:J`)}`,
      { headers: { Authorization: `Bearer ${activeToken}` } }
    );
    if (!mmRes.ok) return false;

    const mmData = await mmRes.json();
    const rows = mmData.values || [];
    const targetNama = (target.nama || '').trim().toUpperCase();
    const targetKod = (target.kod || '').trim().toUpperCase();

    const rowsToDelete: number[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNama = (row[2] || '').toString().trim().toUpperCase();
      const rowKod = (row[9] || '').toString().trim().toUpperCase();
      const rowTugasan = (row[5] || '').toString().trim().toUpperCase();

      let match = (rowNama === targetNama);
      if (targetKod) {
        match = match && (rowKod === targetKod || rowKod.includes(targetKod) || rowTugasan.includes(targetKod));
      }
      if (match) {
        rowsToDelete.push(i);
        break; // Padam satu rekod ini
      }
    }

    if (rowsToDelete.length === 0) return true;

    const requests = rowsToDelete.map(idx => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: idx,
          endIndex: idx + 1
        }
      }
    }));

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      }
    );

    return batchRes.ok;
  } catch (err) {
    console.error('Error deleting single markah row from sheet:', err);
    return false;
  }
}

/**
 * Menambah satu baris rekod markah murid terus ke tab "Markah Murid"
 * Lajur rasmi 10:
 * [Waktu Menjawab, ID Soalan, Nama Murid, Email Murid, Kelas, Tugasan, Markah (%), Status, Status Sync GC, Kod Unik]
 */
export async function appendMarkahMuridRow(
  token: string | null | undefined,
  spreadsheetId: string | null | undefined,
  sub: {
    waktu?: string;
    qid: string;
    nama: string;
    email?: string;
    kelas?: string;
    tugasan?: string;
    markah: number | string | null;
    status?: string;
    statusSyncGc?: string;
    kodUnik?: string;
  }
): Promise<boolean> {
  try {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null);
    const activeSheetId = spreadsheetId || (typeof window !== 'undefined' ? localStorage.getItem('smkj_spreadsheet_id') : null) || '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';

    if (!activeToken || !activeSheetId) return false;

    const rowValues = [
      sub.waktu || new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      (sub.qid || '').toString().trim().toUpperCase(),
      (sub.nama || '').toString().trim().toUpperCase(),
      (sub.email || '').toString().trim(),
      (sub.kelas || '').toString().trim().toUpperCase(),
      (sub.tugasan || 'TUGASAN INTERAKTIF').toString().trim(),
      sub.markah !== undefined && sub.markah !== null ? `${sub.markah}%` : '-',
      sub.status || 'Selesai',
      sub.statusSyncGc || 'Tugasan Umum',
      (sub.kodUnik || '').toString().trim().toUpperCase()
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent("'Markah Murid'!A:J:append")}?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      }
    );

    return appendRes.ok;
  } catch (err) {
    console.error('Error appending markah murid row:', err);
    return false;
  }
}
