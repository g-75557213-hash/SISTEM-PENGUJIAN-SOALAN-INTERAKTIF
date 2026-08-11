const SHEET_ID = '1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A';
const SHEET_NAME = 'Sheet1';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec';

function doGet(e) {
  const action = e.parameter.action;
  if (action === "syncMarkah") {
    const qid = e.parameter.qid;
    const courseId = e.parameter.courseId;
    const assignmentId = e.parameter.assignmentId;
    const result = syncMarkahKeClassroom(qid, courseId, assignmentId);
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  const qid = e.parameter.qid;
  if (!qid) {
    return HtmlService.createHtmlOutput("<h2>Ralat Parameter</h2><p>Sila sertakan qid dalam pautan (e.g., ?qid=SQ-0001).</p>");
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
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow < 2) return HtmlService.createHtmlOutput("<h2>Ralat</h2><p>Tiada data soalan.</p>");

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const header = data[0];
    const htmlIndex = header.indexOf("CODE HTML");
    const idIndex = header.indexOf("ID Soalan");

    let htmlCode = "";
    for (let i = 1; i < data.length; i++) {
      let currentId = data[i][idIndex] ? data[i][idIndex].toString().trim() : "";
      if (currentId === qid) { 
        htmlCode = data[i][htmlIndex]; 
        break;
      }
    }
    
    if (!htmlCode) return HtmlService.createHtmlOutput("<h2>Ralat</h2><p>Soalan tidak dijumpai.</p>");
    
    // Tarik data e-mel pelajar yang sedang buka link
    let userEmail = "";
    try { userEmail = Session.getActiveUser().getEmail(); } catch (err) {}
    
    let userName = "";
    try {
      if (userEmail) {
        // Tarik nama dari Google Classroom jika API diaktifkan
        const profile = Classroom.UserProfiles.get(userEmail);
        userName = profile.name.fullName;
      }
    } catch (err) {
      if (userEmail) userName = userEmail.split('@')[0].toUpperCase(); // Fallback jika gagal
    }
    
    // Suntik skrip ke dalam HTML soalan (Dengan parameter kelas dan tugasan)
    const scriptToInject = 
      "<script>" +
      "  window.USER_EMAIL = '" + userEmail + "';" +
      "  window.USER_NAME = '" + userName + "';" +
      "  window.QID = '" + qid + "';" +
      "  window.KELAS = '" + kelas + "';" +
      "  window.TUGASAN = '" + tugasan + "';" +
      "  window.KOD = '" + kod + "';" +
      "  window.addEventListener('DOMContentLoaded', function() {" +
      "    if (!window.USER_EMAIL) {" +
      "       var emailManual = prompt('Sistem gagal mengesan akaun DELIMa anda secara automatik.\\\\nSila masukkan E-Mel anda untuk mula:');" +
      "       if(!emailManual) { document.body.innerHTML = '<h2>Akses Ditolak</h2>'; return; }" +
      "       var namaManual = prompt('Sila masukkan Nama Penuh anda:');" +
      "       window.USER_EMAIL = emailManual;" +
      "       window.USER_NAME = namaManual || emailManual.split(\\'@\\')[0];" +
      "    }" +
      "    google.script.run.kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, '', 'Sedang menjawab');" +
      "    window.hantarMarkahKeSistem = function(markah) {" +
      "      google.script.run.withSuccessHandler(function() {" +
      "        alert('Markah anda (' + markah + '%) telah berjaya direkodkan!');" +
      "      }).kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, markah, 'Telah menjawab');" +
      "    };" +
      "  });" +
      "</script>";
    
    let injectedHtml = htmlCode.match(/<\/head>/i) ? htmlCode.replace(/<\/head>/i, scriptToInject + "</head>") : scriptToInject + htmlCode;
    
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
      msg += "\nSebanyak " + markahDeleted + " rekod markah murid yang sepadan juga telah dibuang dari 'Markah Murid'.";
    }
    SpreadsheetApp.getUi().alert(msg);
  } else {
    SpreadsheetApp.getUi().alert("Penyegerakan selesai. Tiada tugasan yang terpadam dijumpai.");
  }
}

// Trigger automatik kemas kini URL (Kekal sama)
function onEdit(e) {
  if (!e) return;
  const range = e.range;
  if (range.getSheet().getName() !== SHEET_NAME) return;
  
  if (range.getColumn() <= 8 && range.getLastColumn() >= 8) {
    janaLinkColumnI();
  }
}

function janaLinkColumnI() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const rangeH = sheet.getRange(2, 8, lastRow - 1, 1);
  const rangeI = sheet.getRange(2, 9, lastRow - 1, 1);
  const valuesH = rangeH.getValues();
  const valuesI = rangeI.getValues();
  let hasChanges = false;
  
  for (let i = 0; i < valuesH.length; i++) {
    const qid = valuesH[i][0] ? valuesH[i][0].toString().trim() : "";
    const currentLink = valuesI[i][0] ? valuesI[i][0].toString().trim() : "";
    if (qid) {
      const expectedLink = WEB_APP_URL + "?qid=" + qid;
      if (currentLink !== expectedLink) {
        valuesI[i][0] = expectedLink;
        hasChanges = true;
      }
    }
  }
  if (hasChanges) rangeI.setValues(valuesI);
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
