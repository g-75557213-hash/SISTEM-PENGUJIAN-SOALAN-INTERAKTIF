// ========================================================
// SKRIP GOOGLE APPS SCRIPT: SISTEM SOALAN INTERAKTIF & TUGASAN UMUM
// ========================================================
const SHEET_ID = "1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A";
const SHEET_NAME = "Sheet1";

function doGet(e) {
  try {
    const qid = (e && e.parameter && (e.parameter.qid || e.parameter.idSoalan)) ? (e.parameter.qid || e.parameter.idSoalan).toString().trim() : "";
    if (!qid) return HtmlService.createHtmlOutput("<h2>Sila imbas kod QR yang sah.</h2>");
    
    let kelas = e && e.parameter && e.parameter.kelas ? e.parameter.kelas : "";
    let tugasan = e && e.parameter && e.parameter.tugasan ? e.parameter.tugasan : "";
    const kod = e && e.parameter && e.parameter.kod ? e.parameter.kod : "";
    const mod = e && e.parameter && e.parameter.mod ? e.parameter.mod : "";
    const isUmumMode = mod === "umum" || (kod && kod.toString().toUpperCase().startsWith("TU-"));

    // Jika ada kod unik, cari nama kelas & tugasan daripada tab TUGASAN (jika belum dihantar)
    if (kod && (!kelas || !tugasan)) {
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
    
    if (!kelas) kelas = isUmumMode ? "" : "Tiada Kelas";
    if (!tugasan) tugasan = isUmumMode ? "Tugasan Umum" : "Tiada Tugasan";
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let htmlCode = "";
    
    // OPTIMASI: Cuba dapatkan HTML daripada Cache terlebih dahulu
    try {
      const cachedHtml = CacheService.getScriptCache().get("qid_" + qid);
      if (cachedHtml) {
        htmlCode = cachedHtml;
      }
    } catch(cErr) {}

    // CARI DALAM TAB SIMULASI (Jika ID bermula dengan SS- atau demo ID)
    if (!htmlCode && (qid.startsWith("SS-") || qid === "sim_ketumpatan" || qid === "sim_bandul")) {
      const sheetSim = ss.getSheetByName("SIMULASI");
      if (sheetSim) {
        const lastRow = sheetSim.getLastRow();
        const lastCol = sheetSim.getLastColumn();
        if (lastRow >= 2) {
          const header = sheetSim.getRange(1, 1, 1, lastCol).getValues()[0];
          const idCol = (header.indexOf("ID SIMULASI") > -1 ? header.indexOf("ID SIMULASI") : 6) + 1;
          const idList = sheetSim.getRange(2, idCol, lastRow - 1, 1).getValues();
          
          let targetRow = -1;
          for (let i = 0; i < idList.length; i++) {
            if (idList[i][0] && idList[i][0].toString().trim() === qid) {
              targetRow = i + 2;
              break;
            }
          }
          
          if (targetRow > -1) {
            const rowData = sheetSim.getRange(targetRow, 1, 1, lastCol).getValues()[0];
            htmlCode = (rowData[4] || "") + (rowData[5] || "");
            if (rowData.length > 8) {
              for (let j = 8; j < rowData.length; j++) {
                htmlCode += (rowData[j] || "");
              }
            }
          }
        }
      }
    }

    // CARI DALAM TAB SOALAN
    if (!htmlCode) {
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow >= 2) {
          const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          const htmlIndex = header.indexOf("CODE HTML");
          const idIndex = header.indexOf("ID Soalan");
          
          if (htmlIndex > -1 && idIndex > -1) {
            const idList = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
            let targetRow = -1;
            for (let i = 0; i < idList.length; i++) {
              if (idList[i][0] && idList[i][0].toString().trim() === qid) {
                targetRow = i + 2;
                break;
              }
            }
            
            if (targetRow > -1) {
              const rowData = sheet.getRange(targetRow, 1, 1, lastCol).getValues()[0];
              htmlCode = rowData[htmlIndex] || "";
              if (rowData.length > 9) {
                for (let j = 9; j < rowData.length; j++) {
                  htmlCode += (rowData[j] || "");
                }
              }
              if (htmlCode && htmlCode.length < 90000) {
                try {
                  CacheService.getScriptCache().put("qid_" + qid, htmlCode, 21600);
                } catch(eCache) {}
              }
            }
          }
        }
      }
    }
    
    if (!htmlCode) return HtmlService.createHtmlOutput("<h2>Ralat</h2><p>Data tidak dijumpai bagi ID: " + qid + "</p>");
    
    let userEmail = "";
    let userName = "";
    
    try { 
      const activeEmail = Session.getActiveUser().getEmail();
      if (activeEmail) {
        userEmail = activeEmail;
        try {
          const profile = Classroom.UserProfiles.get(userEmail);
          userName = (profile && profile.name && profile.name.fullName) ? profile.name.fullName.toUpperCase() : "";
        } catch (apiErr) {
          userName = userEmail.split('@')[0].toUpperCase(); 
        }
      }
    } catch (err) {
      userEmail = ""; 
      userName = "";
    }
    userEmail = userEmail || "";
    userName = userName || "";
    
    // Suntik skrip ke dalam HTML soalan
    const scriptToInject = '<script>' +
      'window.USER_EMAIL = ' + JSON.stringify(userEmail) + ';' +
      'window.USER_NAME = ' + JSON.stringify(userName) + ';' +
      'window.QID = ' + JSON.stringify(qid) + ';' +
      'window.KELAS = ' + JSON.stringify(kelas) + ';' +
      'window.TUGASAN = ' + JSON.stringify(tugasan) + ';' +
      'window.KOD = ' + JSON.stringify(kod) + ';' +
      'window.IS_UMUM = ' + JSON.stringify(isUmumMode) + ';' +
      'window.addEventListener("DOMContentLoaded", function() {' +
        'function mulakanSesi(nama, emel, kls) {' +
          'window.USER_NAME = nama;' +
          'window.USER_EMAIL = emel || "";' +
          'if (kls) window.KELAS = kls;' +
          'try { localStorage.setItem("umum_name", nama); if (kls) localStorage.setItem("umum_kelas", kls); } catch(e) {}' +
          'google.script.run.kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, "", "Sedang menjawab");' +
          'var popup = document.getElementById("delima-login-popup");' +
          'if (popup) popup.remove();' +
        '}' +
        'if (window.IS_UMUM) {' +
          'var popup = document.createElement("div");' +
          'popup.id = "delima-login-popup";' +
          'popup.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(248,250,252,0.96);backdrop-filter:blur(5px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:20px;box-sizing:border-box;";' +
          'popup.innerHTML = "<style>' +
            '#delima-login-popup input { background-color:#ffffff !important; background:#ffffff !important; color:#000000 !important; -webkit-text-fill-color:#000000 !important; caret-color:#000000 !important; opacity:1 !important; border:2px solid #cbd5e1 !important; text-transform:uppercase !important; font-weight:bold !important; }' +
            '#delima-login-popup input:focus { border-color:#059669 !important; box-shadow:0 0 0 3px rgba(5,150,105,0.18) !important; outline:none !important; }' +
            '</style>' +
            '<div style=\\"background:white;padding:32px;border-radius:22px;box-shadow:0 15px 35px -5px rgba(0,0,0,0.12);max-width:420px;width:100%;border:2px solid #e2e8f0;text-align:center;\\">' +
            '<div style=\\"font-size:38px;margin-bottom:8px;\\">🎓</div>' +
            '<div style=\\"display:inline-block;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:900;margin-bottom:12px;letter-spacing:0.5px;\\">✨ MOD UMUM • TIADA LOG MASUK DIPERLUKAN</div>' +
            '<h2 style=\\"color:#0f172a;margin:0 0 6px 0;font-size:22px;font-weight:900;\\">Pengesahan Murid</h2>' +
            '<p style=\\"color:#475569;font-size:13px;margin-bottom:20px;line-height:1.4;\\">Sila masukkan maklumat anda sebelum mula menjawab soalan kuiz.</p>' +
            '<div style=\\"text-align:left;margin-bottom:16px;\\">' +
              '<div style=\\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\\">' +
                '<label style=\\"display:block;font-size:12px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;\\">NAMA PENUH (HURUF BESAR) <span style=\\"color:#ef4444;\\">*</span></label>' +
                '<span style=\\"font-size:10px;font-weight:900;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;border:1px solid #fde68a;\\">HURUF BESAR</span>' +
              '</div>' +
              '<input type=\\"text\\" id=\\"input-nama\\" placeholder=\\"CONTOH: AHMAD BIN ABDULLAH\\" oninput=\\"this.value = this.value.toUpperCase();\\" style=\\"width:100%;padding:13px 14px;border:2px solid #cbd5e1;border-radius:10px;font-size:15px;box-sizing:border-box;background-color:#ffffff !important;background:#ffffff !important;color:#000000 !important;-webkit-text-fill-color:#000000 !important;caret-color:#000000 !important;font-weight:900;text-transform:uppercase;\\">' +
              '<p style=\\"font-size:11px;color:#64748b;margin:5px 0 0 0;\\">⚠️ Sila taip nama penuh rasmi dalam <b>HURUF BESAR</b> seperti dalam rekod sekolah.</p>' +
            '</div>' +
            '<div style=\\"text-align:left;margin-bottom:22px;\\">' +
              '<label style=\\"display:block;font-size:12px;font-weight:900;color:#0f172a;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;\\">KELAS <span style=\\"color:#ef4444;\\">*</span></label>' +
              '<input type=\\"text\\" id=\\"input-kelas\\" placeholder=\\"CONTOH: 1 ABU BAKAR / 5 CEMERLANG\\" oninput=\\"this.value = this.value.toUpperCase();\\" style=\\"width:100%;padding:13px 14px;border:2px solid #cbd5e1;border-radius:10px;font-size:14px;box-sizing:border-box;background-color:#ffffff !important;background:#ffffff !important;color:#000000 !important;-webkit-text-fill-color:#000000 !important;caret-color:#000000 !important;font-weight:bold;text-transform:uppercase;\\">' +
            '</div>' +
            '<button id=\\"btn-mula\\" style=\\"width:100%;background:linear-gradient(to right, #059669, #0d9488);color:white;border:none;padding:14px;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,0.25);\\">Mula Menjawab Tugasan ➔</button>' +
            '</div>";' +
          'document.body.appendChild(popup);' +
          'if (window.USER_NAME) { document.getElementById("input-nama").value = window.USER_NAME; }' +
          'if (window.KELAS && window.KELAS !== "Tiada Kelas") { document.getElementById("input-kelas").value = window.KELAS; }' +
          'document.getElementById("btn-mula").onclick = function() {' +
            'var nama = document.getElementById("input-nama").value.trim().toUpperCase();' +
            'var kls = document.getElementById("input-kelas").value.trim().toUpperCase();' +
            'if (!nama) { alert("Sila masukkan NAMA PENUH anda dalam HURUF BESAR."); return; }' +
            'if (!kls) { alert("Sila masukkan KELAS anda."); return; }' +
            'mulakanSesi(nama, "", kls);' +
          '};' +
        '} else if (!window.USER_EMAIL) {' +
          'var popup = document.createElement("div");' +
          'popup.id = "delima-login-popup";' +
          'popup.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(248,250,252,0.95);backdrop-filter:blur(5px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:20px;box-sizing:border-box;";' +
          'popup.innerHTML = "<div style=\\"background:white;padding:30px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);max-width:400px;width:100%;border:1px solid #e2e8f0;text-align:center;\\">' +
            '<div style=\\"font-size:40px;margin-bottom:15px;\\">🎓</div>' +
            '<h2 style=\\"color:#1e293b;margin:0 0 10px 0;font-size:22px;font-weight:bold;\\">Pengesahan Identiti</h2>' +
            '<p style=\\"color:#64748b;font-size:14px;margin-bottom:25px;line-height:1.5;\\">Sila masukkan maklumat anda untuk membolehkan guru merekod markah.</p>' +
            '<div style=\\"text-align:left;margin-bottom:15px;\\"><label style=\\"display:block;font-size:12px;font-weight:bold;color:#475569;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;\\">NAMA PENUH (HURUF BESAR)</label><input type=\\"text\\" id=\\"input-nama\\" placeholder=\\"Contoh: ABU BIN ALI\\" oninput=\\"this.value = this.value.toUpperCase();\\" style=\\"width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;background-color:#ffffff !important;background:#ffffff !important;color:#000000 !important;-webkit-text-fill-color:#000000 !important;caret-color:#000000 !important;font-weight:bold;text-transform:uppercase;\\"></div>' +
            '<div style=\\"text-align:margin-bottom:25px;\\"><label style=\\"display:block;font-size:12px;font-weight:bold;color:#475569;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;\\">E-MEL DELIMA</label><input type=\\"email\\" id=\\"input-emel\\" placeholder=\\"m-1234567@moe-dl.edu.my\\" style=\\"width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:monospace;box-sizing:border-box;outline:none;background-color:#ffffff !important;background:#ffffff !important;color:#000000 !important;-webkit-text-fill-color:#000000 !important;caret-color:#000000 !important;font-weight:bold;\\"></div>' +
            '<button id=\\"btn-mula\\" style=\\"width:100%;background:#2563eb;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;\\">Mula Menjawab</button>' +
            '</div>";' +
          'document.body.appendChild(popup);' +
          'document.getElementById("btn-mula").onclick = function() {' +
            'var nama = document.getElementById("input-nama").value.trim().toUpperCase();' +
            'var emel = document.getElementById("input-emel").value.trim().toLowerCase();' +
            'if (!nama) { alert("Sila masukkan nama penuh anda dalam HURUF BESAR."); return; }' +
            'if (!emel) { alert("Sila masukkan e-mel DELIMa anda."); return; }' +
            'if (emel.indexOf("@") === -1) { alert("Sila masukkan e-mel yang sah."); return; }' +
            'mulakanSesi(nama, emel);' +
          '};' +
        '} else {' +
          'google.script.run.kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, "", "Sedang menjawab");' +
        '}' +
        'window.hantarMarkahKeSistem = function(markah) {' +
          'google.script.run.withSuccessHandler(function() {' +
            'alert("Markah anda (" + markah + "%) telah berjaya direkodkan!");' +
          '}).kemaskiniMarkah(window.QID, window.USER_NAME, window.USER_EMAIL, window.KELAS, window.TUGASAN, window.KOD, markah, "Telah menjawab");' +
        '};' +
      '});' +
    '</script>';
    
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

// Fungsi dipanggil secara 'live' dari HTML untuk update Sheet Markah Murid
function kemaskiniMarkah(qid, nama, email, kelas, tugasan, kod, markah, status) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName("Markah Murid");
    
    // Cipta atau semak lajur "Markah Murid" (10 lajur rasmi)
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
          sheet.getRange(1, 1, 1, 10).setValues([headerRow]);
        }
      }
    }
    
    const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const markahStr = (markah !== "" && markah != null) ? markah + "%" : "-";
    const cleanNamaUpper = (nama || "").toString().trim().toUpperCase();
    const cleanKodUpper = (kod || "").toString().trim().toUpperCase();
    const cleanKelasUpper = (kelas || "").toString().trim().toUpperCase();
    
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    
    for (let i = 1; i < data.length; i++) {
      const rowQid = (data[i][1] || "").toString().trim();
      const rowNama = (data[i][2] || "").toString().trim().toUpperCase();
      const rowEmail = (data[i][3] || "").toString().trim().toLowerCase();
      const rowKelas = (data[i][4] || "").toString().trim().toUpperCase();
      const rowKod = (data[i][9] || "").toString().trim().toUpperCase();

      if (email) {
        if (rowQid === qid && rowEmail === email.toLowerCase().trim()) {
          rowIdx = i + 1;
          break;
        }
      } else {
        // Mod Tugasan Umum / Guest: padankan dengan Nama Murid dan Kod Unik / Kelas
        const matchKod = kod ? (rowKod === cleanKodUpper) : (rowKelas === cleanKelasUpper);
        if (rowQid === qid && rowNama === cleanNamaUpper && matchKod) {
          rowIdx = i + 1;
          break;
        }
      }
    }
    
    const rowData = [timestamp, qid, cleanNamaUpper, email, cleanKelasUpper || "Tiada Kelas", tugasan || "Tiada Tugasan", markahStr, status, "", cleanKodUpper || ""];
    
    if (rowIdx !== -1) {
      const existingStatus = data[rowIdx - 1].length >= 8 ? data[rowIdx - 1][7] : data[rowIdx - 1][5];
      const normalizedExisting = (existingStatus || "").toString().toLowerCase().trim();
      const normalizedNew = (status || "").toString().toLowerCase().trim();
      
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

function semakTugasanGC(namaKelas, namaTugasan) {
  try {
    var response = Classroom.Courses.list({ courseStates: ['ACTIVE'] });
    var courses = response.courses || [];
    var courseId = null;
    
    for (var i = 0; i < courses.length; i++) {
      if (courses[i].name.toLowerCase() === namaKelas.toLowerCase()) {
        courseId = courses[i].id;
        break;
      }
    }
    
    if (!courseId) {
      return { success: false, message: "Kelas tidak dijumpai: " + namaKelas };
    }
    
    var cwResponse = Classroom.Courses.CourseWork.list(courseId);
    var courseWorks = cwResponse.courseWork || [];
    
    var matchedCw = null;
    var isWayground = false;
    
    for (var j = 0; j < courseWorks.length; j++) {
      var cw = courseWorks[j];
      if (cw.materials) {
        for (var k = 0; k < cw.materials.length; k++) {
          var m = cw.materials[k];
          if (m.link && m.link.url && (m.link.url.toLowerCase().indexOf('wayground') > -1 || m.link.url.toLowerCase().indexOf('quizizz') > -1)) {
            matchedCw = cw;
            isWayground = true;
            break;
          }
        }
      }
      if (isWayground) break;
    }
    
    if (!matchedCw) {
      for (var j = 0; j < courseWorks.length; j++) {
        if (courseWorks[j].title.toLowerCase() === namaTugasan.toLowerCase()) {
          matchedCw = courseWorks[j];
          isWayground = false;
          break;
        }
      }
    }
    
    if (matchedCw) {
      return {
        success: true,
        courseId: courseId,
        courseWorkId: matchedCw.id,
        namaTugasan: matchedCw.title,
        isWayground: isWayground
      };
    } else {
      return { success: false, message: "Tiada tugasan dijumpai." };
    }
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function simpanDanSyncWayground(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data Wayground");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Data Wayground");
      sheet.appendRow(["Timestamp", "Nama Kelas", "Nama Tugasan", "Nama Pelajar", "Markah"]);
    }
    
    var timestamp = new Date();
    var courseId = data.courseId;
    var courseWorkId = data.courseWorkId;
    var peserta = data.peserta || [];
    var namaKelas = data.namaKelas;
    var namaTugasan = data.namaTugasan;
    
    var studentsResponse = Classroom.Courses.Students.list(courseId);
    var students = studentsResponse.students || [];
    
    var subResponse = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, courseWorkId);
    var submissions = subResponse.studentSubmissions || [];
    
    var syncCount = 0;
    
    for (var i = 0; i < peserta.length; i++) {
      var p = peserta[i];
      var pName = p.nama.toLowerCase();
      var markah = parseFloat(p.markah);
      
      sheet.appendRow([timestamp, namaKelas, namaTugasan, p.nama, markah]);
      
      var matchedUserId = null;
      for (var j = 0; j < students.length; j++) {
        var fullName = (students[j].profile.name.fullName || '').toLowerCase();
        if (fullName === pName || fullName.indexOf(pName) > -1 || pName.indexOf(fullName) > -1) {
          matchedUserId = students[j].userId;
          break;
        }
      }
      
      if (matchedUserId) {
        var subId = null;
        for (var k = 0; k < submissions.length; k++) {
          if (submissions[k].userId === matchedUserId) {
            subId = submissions[k].id;
            break;
          }
        }
        
        if (subId) {
          var updateData = {
            draftGrade: markah,
            assignedGrade: markah
          };
          Classroom.Courses.CourseWork.StudentSubmissions.patch(updateData, courseId, courseWorkId, subId, {
            updateMask: 'draftGrade,assignedGrade'
          });
          syncCount++;
        }
      }
    }
    
    return { success: true, count: syncCount };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
