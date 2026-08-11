const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldAdminCode = `                <ol className="text-xs text-slate-500 list-decimal pl-5 space-y-1">
                  <li>Di Google Spreadsheet anda, pergi ke menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Padamkan sebarang kod asal dan tampal kod Apps Script di bawah.</li>
                  <li>Tekan ikon <strong>Save (Disket)</strong> dan tutup editor skrip.</li>
                  <li>Trigger <code>onEdit</code> akan berjalan secara automatik setiap kali baris soalan baru dimasukkan!</li>
                </ol>
                <div className="relative mt-2.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-900">
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-[10px] font-mono text-slate-400">Code.gs</span>
                    <button
                      onClick={() => {
                        const code = \`// SISTEM PENGUJIAN SOALAN INTERAKTIF SMKJ - GOOGLE APPS SCRIPT
const SHEET_ID = '\${spreadsheetId}';
const SHEET_NAME = 'Sheet1';

// Fungsi untuk menerima request POST (sebagai API simpanan luar jika diperlukan)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'kemaskiniStatus') {
      const result = simpanMarkah(data.qid, data.status, data.markah, data.email, data.nama, data.sijilBase64 || "");
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Action tidak dijumpai' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi utama untuk memaparkan soalan interaktif secara langsung dalam tab baru
function doGet(e) {
  const qid = e.parameter.qid;
  if (!qid) {
    return HtmlService.createHtmlOutput("<h2>Sistem Kuiz Interaktif</h2><p>Sila sertakan parameter qid dalam pautan (e.g., ?qid=QID_XXXX).</p>");
  }
  
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    let htmlCode = "";
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === qid) { // ID Soalan di lajur H / index 7
        htmlCode = data[i][6];  // Kod HTML di lajur G / index 6
        break;
      }
    }
    
    if (!htmlCode) {
      return HtmlService.createHtmlOutput("<h2>Soalan Tidak Dijumpai</h2><p>ID Soalan: <b>" + qid + "</b> tidak dijumpai dalam pangkalan data.</p>");
    }
    
    // Ambil maklumat murid yang sedang menjawab secara automatik jika ada
    let userEmail = "";
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch (err) {}
    
    let userName = "";
    try {
      if (userEmail) {
        // Ambil profil murid daripada Google Classroom secara automatik jika Advanced Service diaktifkan
        const studentProfile = Classroom.UserProfiles.get(userEmail);
        userName = studentProfile.name.fullName;
      }
    } catch (err) {
      // Fallback: Tukarkan awalan e-mel murid menjadi nama yang boleh dibaca
      if (userEmail) {
        userName = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase();
      }
    }
    
    // Skrip suntikan untuk menghantar pembolehubah ke dalam HTML soalan
    const scriptToInject = 
      "<script>" +
      "  window.USER_EMAIL = '" + userEmail + "';" +
      "  window.USER_NAME = '" + userName + "';" +
      "  window.GAS_WEB_APP_URL = '" + ScriptApp.getService().getUrl() + "';" +
      "</script>";
      
    // Suntik skrip sebelum tag penutup </head>
    htmlCode = htmlCode.replace("</head>", scriptToInject + "</head>");

    return HtmlService.createHtmlOutput(htmlCode)
      .setTitle("Soalan Interaktif: " + qid)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (err) {
    return HtmlService.createHtmlOutput("<h2>Ralat</h2><p>" + err.toString() + "</p>");
  }
}

function simpanMarkah(qid, status, markah, email, nama, sijilBase64) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Semakan");
    if (!sheet) {
      return { success: false, message: 'Sheet "Semakan" tidak dijumpai' };
    }
    
    const timestamp = new Date();
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    let existingStatus = '';
    
    // Cari baris murid jika sudah ada berdasarkan QID dan Email
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === qid && data[i][2] === email) { // Anggap Lajur B=QID, Lajur C=Email
        rowIdx = i + 1;
        existingStatus = data[i][5]; // Lajur F=Status
        break;
      }
    }
    
    const rowData = [
      timestamp, 
      qid, 
      email, 
      nama, 
      markah !== null && markah !== undefined ? markah : "", 
      status,
      sijilBase64
    ];
    
    if (rowIdx > -1) {
      // Jika status sedia ada adalah "Telah menjawab", jangan overwrite jika status baru adalah "Sedang menjawab"
      if (existingStatus === 'Telah menjawab' && status === 'Sedang menjawab') {
        return { success: true, message: 'Sudah selesai' };
      }
      sheet.getRange(rowIdx, 1, 1, 6).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    return { success: true, message: 'Markah berjaya direkodkan' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// Menjana pautan automatik apabila sheet diedit
function onEdit(e) {
  janaLinkColumnI();
}

// Menambah menu di bar atas Google Sheets
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Soalan Interaktif')
    .addItem('Jana Link Lajur I (Column I)', 'janaLinkColumnI')
    .addToUi();
}

// Menjana pautan berasaskan Apps Script Web App secara automatik
function janaLinkColumnI() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const webAppUrl = "https://script.google.com/macros/s/AKfycbyBL3nng7I0_ADtD7raoMJhrw1Z41KU_dnxBQi9cYRr2WbfD59kLnPvKsazRcz6-H2acg/exec";
  
  const range = sheet.getRange(2, 8, lastRow - 1, 2);
  const values = range.getValues();
  
  let linkBaruValues = [];
  
  for (let i = 0; i < values.length; i++) {
    const qid = values[i][0];
    const existingLink = values[i][1];
    
    // Check if the link already exists and is a valid URL starting with http
    const isUrlSah = existingLink && typeof existingLink === 'string' && existingLink.startsWith("http");
    
    if (qid && !isUrlSah) {
      const linkBaru = webAppUrl + "?qid=" + qid;
      linkBaruValues.push([linkBaru]);
    } else {
      // Keep existing
      linkBaruValues.push([existingLink]);
    }
  }
  
  // Update all links in Column I at once (batch)
  const linkRange = sheet.getRange(2, 9, linkBaruValues.length, 1);
  linkRange.setValues(linkBaruValues);
}\`;`;

if (code.includes(oldAdminCode)) {
  const newAdminCode = `                <ol className="text-xs text-slate-500 list-decimal pl-5 space-y-1">
                  <li>Di Google Spreadsheet anda, pergi ke menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Padamkan sebarang kod asal dan tampal kod Apps Script di bawah.</li>
                  <li>Tekan ikon <strong>Save (Disket)</strong> dan tutup editor skrip.</li>
                  <li>Anda boleh menggunakan <strong>Formula ARRAYFORMULA</strong> di Google Sheets untuk menjana ID dan pautan secara terus.</li>
                </ol>
                <div className="relative mt-2.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-900">
                  <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-[10px] font-mono text-slate-400">Code.gs</span>
                    <button
                      onClick={() => {
                        const code = \`// SISTEM PENGUJIAN SOALAN INTERAKTIF SMKJ - GOOGLE APPS SCRIPT
const SHEET_ID = '\${spreadsheetId}';
const SHEET_NAME = 'Sheet1';

// Fungsi untuk menerima request POST (sebagai API simpanan luar jika diperlukan)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'kemaskiniStatus') {
      const result = simpanMarkah(data.qid, data.status, data.markah, data.email, data.nama, data.sijilBase64 || "");
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Action tidak dijumpai' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi utama untuk memaparkan soalan interaktif secara langsung dalam tab baru
function doGet(e) {
  const qid = e.parameter.qid;
  if (!qid) {
    return HtmlService.createHtmlOutput("<h2>Sistem Kuiz Interaktif</h2><p>Sila sertakan parameter qid dalam pautan (e.g., ?qid=QID_XXXX).</p>");
  }
  
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    let htmlCode = "";
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === qid) { // ID Soalan di lajur H / index 7
        htmlCode = data[i][6];  // Kod HTML di lajur G / index 6
        break;
      }
    }
    
    if (!htmlCode) {
      return HtmlService.createHtmlOutput("<h2>Soalan Tidak Dijumpai</h2><p>ID Soalan: <b>" + qid + "</b> tidak dijumpai dalam pangkalan data.</p>");
    }
    
    // Ambil maklumat murid yang sedang menjawab secara automatik jika ada
    let userEmail = "";
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch (err) {}
    
    let userName = "";
    try {
      if (userEmail) {
        // Ambil profil murid daripada Google Classroom secara automatik jika Advanced Service diaktifkan
        const studentProfile = Classroom.UserProfiles.get(userEmail);
        userName = studentProfile.name.fullName;
      }
    } catch (err) {
      // Fallback: Tukarkan awalan e-mel murid menjadi nama yang boleh dibaca
      if (userEmail) {
        userName = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase();
      }
    }
    
    // Skrip suntikan untuk menghantar pembolehubah ke dalam HTML soalan
    const scriptToInject = 
      "<script>" +
      "  window.USER_EMAIL = '" + userEmail + "';" +
      "  window.USER_NAME = '" + userName + "';" +
      "  window.GAS_WEB_APP_URL = '" + ScriptApp.getService().getUrl() + "';" +
      "</script>";
      
    // Suntik skrip sebelum tag penutup </head>
    htmlCode = htmlCode.replace("</head>", scriptToInject + "</head>");

    return HtmlService.createHtmlOutput(htmlCode)
      .setTitle("Soalan Interaktif: " + qid)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (err) {
    return HtmlService.createHtmlOutput("<h2>Ralat</h2><p>" + err.toString() + "</p>");
  }
}

function simpanMarkah(qid, status, markah, email, nama, sijilBase64) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Semakan");
    if (!sheet) {
      return { success: false, message: 'Sheet "Semakan" tidak dijumpai' };
    }
    
    const timestamp = new Date();
    const data = sheet.getDataRange().getValues();
    let rowIdx = -1;
    let existingStatus = '';
    
    // Cari baris murid jika sudah ada berdasarkan QID dan Email
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === qid && data[i][2] === email) { // Anggap Lajur B=QID, Lajur C=Email
        rowIdx = i + 1;
        existingStatus = data[i][5]; // Lajur F=Status
        break;
      }
    }
    
    const rowData = [
      timestamp, 
      qid, 
      email, 
      nama, 
      markah !== null && markah !== undefined ? markah : "", 
      status,
      sijilBase64
    ];
    
    if (rowIdx > -1) {
      // Jika status sedia ada adalah "Telah menjawab", jangan overwrite jika status baru adalah "Sedang menjawab"
      if (existingStatus === 'Telah menjawab' && status === 'Sedang menjawab') {
        return { success: true, message: 'Sudah selesai' };
      }
      sheet.getRange(rowIdx, 1, 1, 7).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    return { success: true, message: 'Markah berjaya direkodkan' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}\`;`;
  code = code.replace(oldAdminCode, newAdminCode);
  fs.writeFileSync('src/App.tsx', code);
  console.log('App.tsx updated successfully.');
} else {
  console.log('App.tsx string not found.');
}
