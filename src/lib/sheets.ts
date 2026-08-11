
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
      
      // 1. Instant fallback pre-calculation
      idSoalan = `SQ-${String(rowNum - 1).padStart(4, '0')}`;
      
      const defaultGasUrl = "https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec";
      const activeGasUrl = gasWebAppUrl || defaultGasUrl;
      linkSoalan = `${activeGasUrl}${activeGasUrl.includes('?') ? '&' : '?'}qid=${idSoalan}`;

      // 2. Fetch the actual computed values from Sheets (if the formula is already calculated)
      try {
        // Wait a small moment to let the array formula calculate
        await new Promise(r => setTimeout(r, 800));
        
        const rowRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowNum}:I${rowNum}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (rowRes.ok) {
          const rowData = await rowRes.json();
          if (rowData.values && rowData.values[0]) {
            const sheetIdSoalan = rowData.values[0][7];
            const sheetLinkSoalan = rowData.values[0][8];
            if (sheetIdSoalan) idSoalan = sheetIdSoalan;
            if (sheetLinkSoalan && sheetLinkSoalan.startsWith("http")) {
              linkSoalan = sheetLinkSoalan;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch generated ID and Link:', err);
      }
    }
  }

  // Save to Firestore too for instant, private-safe loading by students
  if (idSoalan) {
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
      console.error('Failed to cache question in Firestore:', e);
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
    if (res.status === 401) {
      throw new Error('UNAUTHENTICATED');
    }
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
  
  return rows.slice(startIdx).map((row: any[]) => ({
    timestamp: row[0] || '',
    namaGuru: row[1] || '',
    tingkatan: row[2] || '',
    subjek: row[3] || '',
    bab: row[4] || '',
    sp: row[5] || '',
    html: row[6] || '',
    idSoalan: row[7] || '',
    linkSoalan: row[8] || ''
  })).reverse(); // Reverse so newest is first
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
  courseWorkId: string
): Promise<void> {
  try {
    // Update G & H (CourseId, CourseWorkId)
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TUGASAN!G${rowNum}:H${rowNum}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [[courseId, courseWorkId]] })
    });
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

export async function deleteTugasanAndScoresFromSheets(
  token: string,
  spreadsheetId: string,
  qid: string,
  courseId?: string,
  courseWorkId?: string
): Promise<boolean> {
  try {
    // 1. Ambil data baris TUGASAN
    const tugRows = await getTugasanRows(token, spreadsheetId);
    if (!tugRows || tugRows.length === 0) {
      console.warn("Tiada baris dijumpai dalam helaian TUGASAN.");
      return false;
    }

    const rowsToDeleteIndices: number[] = [];
    const uniqueCodesToDelete: string[] = [];

    for (let i = 0; i < tugRows.length; i++) {
      const row = tugRows[i];
      const rowQid = (row[1] || '').toString().toUpperCase().trim();
      const rowKodUnik = (row[3] || '').toString().toUpperCase().trim();
      const rowCourseId = (row[6] || '').toString().trim();
      const rowCourseWorkId = (row[7] || '').toString().trim();

      let matches = false;
      if (courseId && courseWorkId) {
        // Padanan tugasan kelas tertentu sahaja
        if (
          rowQid === qid.toUpperCase().trim() &&
          rowCourseId === courseId.toString().trim() &&
          rowCourseWorkId === courseWorkId.toString().trim()
        ) {
          matches = true;
        }
      } else if (courseId) {
        if (
          rowQid === qid.toUpperCase().trim() &&
          rowCourseId === courseId.toString().trim()
        ) {
          matches = true;
        }
      } else {
        // Padanan semua kelas bagi ID Soalan ini
        if (rowQid === qid.toUpperCase().trim()) {
          matches = true;
        }
      }

      if (matches) {
        // Range dalam Google Sheets adalah 1-indexed
        rowsToDeleteIndices.push(i + 1);
        if (rowKodUnik) {
          uniqueCodesToDelete.push(rowKodUnik);
        }
      }
    }

    if (rowsToDeleteIndices.length === 0) {
      console.log("Tiada baris TUGASAN yang sepadan untuk dipadam.");
    } else {
      console.log("Baris TUGASAN untuk dipadam:", rowsToDeleteIndices);
      console.log("Kod unik untuk dipadam dari Markah Murid:", uniqueCodesToDelete);
    }

    // 2. Dapatkan Metadata Spreadsheet untuk mencari sheetId bagi tab TUGASAN dan Markah Murid
    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,sheets.properties.sheetId`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metadataRes.ok) {
      console.error("Gagal mendapatkan metadata spreadsheet.");
      return false;
    }
    const metadata = await metadataRes.json();
    const sheetsMeta = metadata.sheets || [];

    const tugasanSheetMeta = sheetsMeta.find((s: any) => s.properties.title === 'TUGASAN');
    const markahSheetMeta = sheetsMeta.find((s: any) => s.properties.title === 'Markah Murid');

    const requests: any[] = [];

    // Padam baris dari tab TUGASAN
    if (tugasanSheetMeta && rowsToDeleteIndices.length > 0) {
      const sheetId = tugasanSheetMeta.properties.sheetId;
      // Susun secara menurun supaya indeks baris tidak berubah semasa pemadaman
      const sortedIndicesDesc = [...rowsToDeleteIndices].sort((a, b) => b - a);
      for (const rowIndex of sortedIndicesDesc) {
        requests.push({
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-indexed, inclusive
              endIndex: rowIndex // 0-indexed, exclusive (memadam tepat 1 baris)
            }
          }
        });
      }
    }

    // Padam baris dari tab Markah Murid menggunakan Kod Unik
    if (markahSheetMeta && uniqueCodesToDelete.length > 0) {
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
          console.log("Baris Markah Murid untuk dipadam:", mmRowsToDeleteIndices);
          const mmSheetId = markahSheetMeta.properties.sheetId;
          // Susun secara menurun
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
    }

    // Hantar batchUpdate sekiranya ada tugasan untuk dipadam
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
        console.error("Gagal melakukan batchUpdate padam baris:", await batchRes.text());
        return false;
      }
      console.log("Berjaya memadam baris di helaian TUGASAN dan Markah Murid.");
      return true;
    }

    return true;
  } catch (err) {
    console.error("Ralat dalam deleteTugasanAndScoresFromSheets:", err);
    return false;
  }
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
