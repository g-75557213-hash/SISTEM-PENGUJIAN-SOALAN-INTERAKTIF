import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  QueryConstraint
} from "firebase/firestore";

// Read Firebase config to get dynamic projectId and firestoreDatabaseId
let firebaseConfig: any = {
  projectId: "mineral-actor-450802-f9",
  appId: "1:477104692393:web:79b06a76abf681ed85ddb8",
  apiKey: "AIzaSyBoZYJedGucsSckBDVBZOA3Uvx3KUH94us",
  authDomain: "mineral-actor-450802-f9.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-c473e287-8d6c-452e-8a47-f0e2ebe17b17",
};

try {
  const possiblePaths = [
    path.join(process.cwd(), "firebase-applet-config.json"),
    path.join(__dirname, "firebase-applet-config.json"),
    path.join(__dirname, "..", "firebase-applet-config.json")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      firebaseConfig = { ...firebaseConfig, ...JSON.parse(fs.readFileSync(p, "utf8")) };
      break;
    }
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json, using fallback configuration:", e);
}

let firestoreInstance: any = null;
try {
  const clientApp = initializeApp(firebaseConfig);
  firestoreInstance = getFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Firebase clientApp initialization notice:", e);
}

// In-memory fallback stores for high resilience (works in serverless, offline, or DB timeouts)
const inMemoryTugasanUmum = new Map<string, any>();
const inMemorySubmissions = new Map<string, any>();

const FieldValue = {
  serverTimestamp: () => "SERVER_TIMESTAMP_PLACEHOLDER"
};

class DocRef {
  constructor(private colName: string, private docId: string) {}

  async set(data: any, options?: { merge?: boolean }) {
    if (!firestoreInstance) return null;
    try {
      const ref = doc(firestoreInstance, this.colName, this.docId);
      const processedData = this.replacePlaceholders(data);
      return await setDoc(ref, processedData, { merge: options?.merge ?? false });
    } catch (e) {
      console.warn(`DocRef.set failed for ${this.colName}/${this.docId}:`, e);
      throw e;
    }
  }

  async get() {
    if (!firestoreInstance) {
      return { exists: false, data: () => undefined };
    }
    try {
      const ref = doc(firestoreInstance, this.colName, this.docId);
      const snap = await getDoc(ref);
      return {
        exists: snap.exists(),
        data: () => snap.data()
      };
    } catch (e) {
      console.warn(`DocRef.get failed for ${this.colName}/${this.docId}:`, e);
      return { exists: false, data: () => undefined };
    }
  }

  async delete() {
    if (!firestoreInstance) return null;
    try {
      const ref = doc(firestoreInstance, this.colName, this.docId);
      return await deleteDoc(ref);
    } catch (e) {
      console.warn(`DocRef.delete failed for ${this.colName}/${this.docId}:`, e);
      return null;
    }
  }

  private replacePlaceholders(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const result: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (obj[key] === "SERVER_TIMESTAMP_PLACEHOLDER") {
        result[key] = serverTimestamp();
      } else if (typeof obj[key] === 'object') {
        result[key] = this.replacePlaceholders(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  }
}

class QueryAdapter {
  private constraints: QueryConstraint[] = [];

  constructor(private colName: string) {}

  where(field: string, op: any, val: any) {
    this.constraints.push(where(field, op, val));
    return this;
  }

  async get() {
    if (!firestoreInstance) {
      return { size: 0, forEach: () => {}, docs: [] };
    }
    try {
      const colRef = collection(firestoreInstance, this.colName);
      const q = query(colRef, ...this.constraints);
      const snap = await getDocs(q);
      
      const docs = snap.docs.map(d => ({
        id: d.id,
        exists: d.exists(),
        data: () => d.data()
      }));

      return {
        size: snap.size,
        forEach: (callback: (doc: any) => void) => docs.forEach(callback),
        docs
      };
    } catch (e) {
      console.warn(`QueryAdapter.get failed for ${this.colName}:`, e);
      return {
        size: 0,
        forEach: (_callback: (doc: any) => void) => {},
        docs: []
      };
    }
  }
}

class DbAdapter {
  collection(colName: string) {
    return {
      doc: (docId: string) => new DocRef(colName, docId),
      where: (field: string, op: any, val: any) => new QueryAdapter(colName).where(field, op, val),
      get: () => new QueryAdapter(colName).get()
    };
  }
}

const db = new DbAdapter();


export const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Allow large payloads for base64 certificates

  // API Routes
  app.post("/api/generate-game", async (req, res) => {
    try {
      const { idea, mode, topic, gradeLevel } = req.body;
      if (!idea) {
        return res.status(400).json({ error: "Sila berikan idea permainan/simulasi" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY tidak ditemui dalam persekitaran pelayan. Sila salin Prompt yang dijana untuk digunakan di Gemini." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `Anda ialah pakar reka bentuk permainan pendidikan interaktif KSSM dan simulasi sains berasaskan web (HTML5 Canvas / CSS3 / Web Audio API).
Tugas anda adalah menjana kod HTML5 yang bersendirian (single-file HTML) berdasarkan idea guru.
Kod HTML ini MESTI merangkumi:
1. Reka bentuk UI visual yang menarik dengan Tailwind CSS CDN (https://cdn.tailwindcss.com).
2. Kesan bunyi synthesizer guna Web Audio API (tanpa fail audio luaran).
3. Interaktiviti penuh (drag-and-drop, slider, quiz, atau kawalan canvas).
4. Fungsi penyerahan markah automatik: window.hantarMarkahKeSistem(markah) yang dipanggil apabila pemain menyelesaikan tugasan.
5. Sesuai untuk paparan komputer dan telefon pintar.

Sila pulangkan jawapan dalam format JSON SAHAJA yang mengandungi struktur ini:
{
  "title": "Nama Permainan / Simulasi",
  "description": "Penerangan ringkas mekanik dan objektif pembelajaran",
  "generatedPrompt": "Teks prompt induk berkuasa tinggi yang telah diperkemaskan",
  "html": "<!DOCTYPE html>..."
}`;

      const userPrompt = `Idea Permainan/Simulasi Guru: "${idea}".
Mod: ${mode || 'Gamifikasi Live'}.
Subjek/Topik: ${topic || 'Sains / STEM KSSM'}.
Tingkatan: ${gradeLevel || 'Tingkatan 4'}.

Hasilkan kod HTML5 permainan/simulasi interaktif yang lengkap, menarik, dan sedia dimainkan!`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const jsonResult = JSON.parse(text);
      res.json(jsonResult);
    } catch (err: any) {
      console.error("Gagal menjana permainan dengan Gemini API:", err);
      res.status(500).json({ error: err.message || "Gagal menjana permainan dengan Gemini AI" });
    }
  });

  app.post("/api/submit-score", async (req, res) => {
    try {
      const { qid, status, markah, email, nama, sijilBase64, isUmum, kod, kelas } = req.body;
      
      // For Tugasan Umum (tanpa GC), email is optional, but nama and (qid or kod) are required
      if (isUmum || kod) {
        if (!nama || (!qid && !kod)) {
          return res.status(400).json({ error: "Missing required fields (nama, qid or kod)" });
        }
        const safeNama = encodeURIComponent(String(nama).trim().toUpperCase());
        const safeKod = kod ? String(kod).trim().toUpperCase() : (qid || 'UMUM');
        const docId = `umum_${safeKod}_${safeNama}`;

        const dataToSave = {
          qid: qid || '',
          kod: kod ? String(kod).trim().toUpperCase() : '',
          kelas: kelas || '',
          nama: String(nama).trim().toUpperCase(),
          status: status || 'Selesai',
          markah: markah !== undefined && markah !== null ? Number(markah) : null,
          email: email || '',
          sijilBase64: sijilBase64 || null,
          isUmum: true,
          updatedAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
        };

        inMemorySubmissions.set(docId, dataToSave);

        try {
          const submissionRef = db.collection('submissions').doc(docId);
          await submissionRef.set({
            ...dataToSave,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (dbErr) {
          console.warn("Firestore save notice for submission (saved to memory):", dbErr);
        }

        return res.json({ success: true, message: "Markah tugasan umum berjaya disimpan" });
      }

      if (!qid || !email) {
        return res.status(400).json({ error: "Missing required fields (qid, email)" });
      }

      const submissionRef = db.collection('submissions').doc(`${qid}_${email}`);
      
      await submissionRef.set({
        qid,
        status: status || 'Selesai',
        markah: markah !== undefined && markah !== null ? Number(markah) : null,
        email,
        nama: nama || '',
        sijilBase64: sijilBase64 || null,
        isUmum: false,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({ success: true, message: "Markah berjaya disimpan" });
    } catch (error) {
      console.error("Error submitting score:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoints for Tugasan Umum (Public Assignments)
  app.post("/api/tugasan-umum", async (req, res) => {
    try {
      const { kod, qid, soalanTajuk, tingkatan, subjek, bab, kelas, guruEmail, guruNama } = req.body;
      if (!kod || !qid || !kelas) {
        return res.status(400).json({ error: "Missing required fields (kod, qid, kelas)" });
      }

      const cleanKod = String(kod).toUpperCase().trim();
      const assignmentData = {
        kod: cleanKod,
        qid,
        soalanTajuk: soalanTajuk || bab || '',
        tingkatan: tingkatan || '',
        subjek: subjek || '',
        bab: bab || '',
        kelas: String(kelas).trim(),
        guruEmail: guruEmail || '',
        guruNama: guruNama || '',
        createdAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
      };

      // Always save to in-memory store immediately
      inMemoryTugasanUmum.set(cleanKod, assignmentData);

      // Best effort save to Firestore
      try {
        const docRef = db.collection("tugasan_umum").doc(cleanKod);
        await docRef.set({
          ...assignmentData,
          createdAt: FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore save notice for tugasan_umum (saved to memory):", dbErr);
      }

      return res.json({ success: true, message: "Tugasan umum berjaya dicipta", kod: cleanKod });
    } catch (error: any) {
      console.error("Error creating tugasan umum:", error);
      const fallbackKod = (req.body?.kod || '').toUpperCase().trim();
      if (fallbackKod) {
        return res.json({ success: true, message: "Tugasan umum berjaya dicipta (fallback)", kod: fallbackKod });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tugasan-umum", async (req, res) => {
    try {
      const { guruEmail, qid } = req.query;
      const resultsMap = new Map<string, any>();

      // Seed with in-memory store
      inMemoryTugasanUmum.forEach((val, key) => {
        let match = true;
        if (guruEmail && val.guruEmail !== guruEmail) match = false;
        if (qid && val.qid !== qid) match = false;
        if (match) resultsMap.set(key, val);
      });

      // Query Firestore with error safety
      try {
        let queryRef: any = db.collection("tugasan_umum");
        if (guruEmail) {
          queryRef = queryRef.where("guruEmail", "==", guruEmail);
        }
        if (qid) {
          queryRef = queryRef.where("qid", "==", qid);
        }

        const snapshot = await queryRef.get();
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          if (!data) return;
          let createdAtStr = "";
          if (data.createdAt) {
            try {
              createdAtStr = typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
                : new Date(data.createdAt).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
            } catch (e) {
              createdAtStr = String(data.createdAt);
            }
          }
          const itemKod = (data.kod || doc.id).toUpperCase().trim();
          resultsMap.set(itemKod, { ...data, kod: itemKod, createdAt: createdAtStr || data.createdAt });
        });
      } catch (dbErr) {
        console.warn("Firestore fetch warning for tugasan_umum:", dbErr);
      }

      res.json(Array.from(resultsMap.values()));
    } catch (error) {
      console.error("Error fetching tugasan umum:", error);
      res.json(Array.from(inMemoryTugasanUmum.values()));
    }
  });

  app.delete("/api/tugasan-umum/:kod", async (req, res) => {
    try {
      const { kod } = req.params;
      if (!kod) return res.status(400).json({ error: "Missing kod" });
      const cleanKod = kod.toUpperCase().trim();
      inMemoryTugasanUmum.delete(cleanKod);
      try {
        await db.collection("tugasan_umum").doc(cleanKod).delete();
      } catch (dbErr) {
        console.warn("Firestore delete notice:", dbErr);
      }
      res.json({ success: true, message: "Tugasan umum berjaya dipadam" });
    } catch (error) {
      console.error("Error deleting tugasan umum:", error);
      res.json({ success: true, message: "Tugasan umum dipadam secara tempatan" });
    }
  });

  app.get("/api/tugasan-umum-submissions", async (req, res) => {
    try {
      const { kod, qid } = req.query;
      const resultsMap = new Map<string, any>();

      inMemorySubmissions.forEach((val, key) => {
        let match = true;
        const valKod = (val.kod || '').toUpperCase().trim();
        const valQid = (val.qid || '').toUpperCase().trim();
        const valBab = (val.bab || '').toUpperCase().trim();
        if (valKod.startsWith('WG-') || valQid === 'WAYGROUND' || valBab === 'WAYGROUND') {
          match = false;
        }
        if (kod && valKod !== String(kod).toUpperCase().trim()) match = false;
        if (qid && valQid !== String(qid).toUpperCase().trim()) match = false;
        if (match) resultsMap.set(key, val);
      });

      try {
        let queryRef: any = db.collection("submissions").where("isUmum", "==", true);
        if (kod) {
          queryRef = queryRef.where("kod", "==", String(kod).toUpperCase().trim());
        } else if (qid) {
          queryRef = queryRef.where("qid", "==", String(qid));
        }

        const snapshot = await queryRef.get();
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          if (!data) return;
          const dataKod = (data.kod || '').toUpperCase().trim();
          const dataQid = (data.qid || '').toUpperCase().trim();
          const dataBab = (data.bab || '').toUpperCase().trim();
          if (dataKod.startsWith('WG-') || dataQid === 'WAYGROUND' || dataBab === 'WAYGROUND') return;

          let updatedAtStr = "";
          if (data.updatedAt) {
            try {
              updatedAtStr = typeof data.updatedAt.toDate === 'function'
                ? data.updatedAt.toDate().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
                : new Date(data.updatedAt).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
            } catch (e) {
              updatedAtStr = String(data.updatedAt);
            }
          }
          resultsMap.set(doc.id, { ...data, updatedAt: updatedAtStr || data.updatedAt });
        });
      } catch (dbErr) {
        console.warn("Firestore fetch warning for submissions:", dbErr);
      }

      res.json(Array.from(resultsMap.values()));
    } catch (error) {
      console.error("Error fetching tugasan umum submissions:", error);
      res.json(Array.from(inMemorySubmissions.values()));
    }
  });

  app.get("/api/tugasan-umum-submissions", async (req, res) => {
    try {
      const { kod, qid } = req.query;
      let queryRef: any = db.collection("submissions").where("isUmum", "==", true);
      
      if (kod) {
        queryRef = queryRef.where("kod", "==", String(kod).toUpperCase().trim());
      } else if (qid) {
        queryRef = queryRef.where("qid", "==", String(qid));
      }

      const snapshot = await queryRef.get();
      const list: any[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        let updatedAtStr = "";
        if (data.updatedAt) {
          try {
            updatedAtStr = typeof data.updatedAt.toDate === 'function'
              ? data.updatedAt.toDate().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
              : new Date(data.updatedAt).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
          } catch (e) {
            updatedAtStr = String(data.updatedAt);
          }
        }
        list.push({ ...data, updatedAt: updatedAtStr });
      });

      res.json(list);
    } catch (error) {
      console.error("Error fetching tugasan umum submissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/assignment-status", async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: "Missing email" });
      }
      const snapshot = await db.collection("assignment_status").where("email", "==", email).get();
      const status: Record<string, any> = {};
      snapshot.forEach(doc => {
        status[doc.data().qid] = doc.data();
      });
      res.json(status);
    } catch (error) {
      console.error("Error fetching assignment status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/assignment-status", async (req, res) => {
    try {
      const { qid, email, assignments, title } = req.body;
      if (!qid || !email || !assignments) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const docRef = db.collection("assignment_status").doc(`${qid}_${email}`);
      const docSnapshot = await docRef.get();
      let existingAssignments = [];
      if (docSnapshot.exists) {
        existingAssignments = docSnapshot.data()?.assignments || [];
      }
      
      // Merge new assignments
      const newAssignmentsMap = new Map();
      existingAssignments.forEach((a: any) => newAssignmentsMap.set(a.courseId, a));
      assignments.forEach((a: any) => newAssignmentsMap.set(a.courseId, a));
      
      const dataToSave: any = {
        qid,
        email,
        assignments: Array.from(newAssignmentsMap.values()),
        status: "posted",
        updatedAt: FieldValue.serverTimestamp()
      };
      if (title) dataToSave.title = title;

      await docRef.set(dataToSave, { merge: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting assignment status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/assignment-status/remove", async (req, res) => {
    try {
      const { qid, email, courseId } = req.body;
      if (!qid || !email || !courseId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const docRef = db.collection("assignment_status").doc(`${qid}_${email}`);
      const docSnapshot = await docRef.get();
      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        const assignments = data?.assignments || [];
        const updatedAssignments = assignments.filter((a: any) => a.courseId !== courseId);
        
        if (updatedAssignments.length === 0) {
          await docRef.delete();
        } else {
          await docRef.set({
            ...data,
            assignments: updatedAssignments,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: false });
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing single class assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/assignment-status/:id", async (req, res) => {
    try {
      await db.collection("assignment_status").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/submissions", async (req, res) => {
    try {
      const { qid } = req.query;
      if (!qid) return res.status(400).json({ error: "Missing qid" });
      const snapshot = await db.collection("submissions").where("qid", "==", qid).get();
      const submissions: any[] = [];
      snapshot.forEach(doc => submissions.push(doc.data()));
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/all-submissions", async (req, res) => {
    try {
      const snapshot = await db.collection("submissions").get();
      const submissions: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        let updatedAtStr = "";
        if (data.updatedAt) {
          // If Firestore timestamp, convert to date
          try {
            updatedAtStr = typeof data.updatedAt.toDate === 'function' 
              ? data.updatedAt.toDate().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
              : new Date(data.updatedAt).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
          } catch (e) {
            updatedAtStr = String(data.updatedAt);
          }
        }
        submissions.push({
          ...data,
          updatedAt: updatedAtStr
        });
      });
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/save-question", async (req, res) => {
    try {
      const { idSoalan, namaGuru, tingkatan, subjek, bab, sp, html, linkSoalan } = req.body;
      if (!idSoalan || !html) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      await db.collection("questions").doc(idSoalan).set({
        idSoalan,
        namaGuru: namaGuru || "",
        tingkatan: tingkatan || "",
        subjek: subjek || "",
        bab: bab || "",
        sp: sp || "",
        html,
        linkSoalan: linkSoalan || "",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      res.json({ success: true, message: "Soalan berjaya disimpan ke Firestore" });
    } catch (error) {
      console.error("Error saving question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/question", async (req, res) => {
    try {
      const { qid, spreadsheetId } = req.query;
      if (!qid) return res.status(400).json({ error: "Missing qid" });

      const sheetId = spreadsheetId ? String(spreadsheetId) : "1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A";

      let linkSoalan = "";
      let fallbackHtml = "";

      // 1. First, check Firestore cache
      const docRef = db.collection("questions").doc(String(qid));
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const docData = docSnap.data();
        linkSoalan = docData?.linkSoalan || "";
        fallbackHtml = docData?.html || "";
      }

      // 2. Fetch the latest row from Google Sheets to get the live Column I URL created by Apps Script
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`);
        if (response.ok) {
          const text = await response.text();
          const jsonString = text.substring(47, text.length - 2);
          const data = JSON.parse(jsonString);
          
          const rowsData = data.table.rows;
          for (const row of rowsData) {
            // Column H (index 7) is ID Soalan
            if (row.c && row.c[7] && row.c[7].v === qid) {
              // Column I (index 8) is the Link Soalan created by Apps Script
              const sheetLink = row.c[8] ? row.c[8].v : "";
              if (sheetLink && sheetLink.startsWith("http")) {
                linkSoalan = sheetLink;
              }
              // Column G (index 6) is HTML
              if (row.c[6] && row.c[6].v) {
                fallbackHtml = row.c[6].v;
              }
              break;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching latest link from Google Sheets inside /api/question:", err);
      }

      // 3. If we already have the full HTML from Firestore (which has no 50k character limit),
      // we prioritize returning it over the Google Apps Script version to prevent truncation issues.
      if (fallbackHtml && fallbackHtml.trim().length > 100) {
         console.log(`Menggunakan cache Firestore yang lengkap untuk soalan ${qid}`);
         return res.json({ html: fallbackHtml });
      }

      // 4. Read/fetch the URL created by Apps Script on Column I ONLY if it is a Google Apps Script URL.
      // If it is our React App direct URL, we do not fetch it; instead, we return the direct question HTML from fallbackHtml.
      if (linkSoalan && linkSoalan.startsWith("http") && linkSoalan.includes("script.google.com")) {
        try {
          console.log(`Membaca URL dari Column I: ${linkSoalan}`);
          const htmlResponse = await fetch(linkSoalan);
          if (htmlResponse.ok) {
            const htmlContent = await htmlResponse.text();
            
            // Check if the returned content is a Google Login page (redirected due to unauthenticated server requests)
            const isGoogleLogin = htmlContent.includes("accounts.google.com") || 
                                 htmlContent.includes("Service Login") || 
                                 htmlContent.includes("Sign in - Google Accounts");
            
            if (htmlContent && htmlContent.trim().length > 100 && !isGoogleLogin) {
              return res.json({ html: htmlContent });
            } else if (isGoogleLogin) {
              console.warn("Mendapat halaman log masuk Google daripada URL Apps Script. Menggunakan salinan sandaran daripada Firestore.");
            }
          }
        } catch (fetchErr) {
          console.error(`Gagal membaca HTML dari URL Column I: ${linkSoalan}`, fetchErr);
        }
      }

      // 4. Fallback to cached HTML if Column I link fetch was empty or failed
      if (fallbackHtml) {
        return res.json({ html: fallbackHtml });
      }

      res.status(404).json({ error: "Question not found" });
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  
// Vite setup and Start Server
async function setupViteAndStart() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite not available");
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    if (!process.env.VERCEL) {
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}
setupViteAndStart();
export default app;
