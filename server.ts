import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
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
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const clientApp = initializeApp(firebaseConfig);
const firestoreInstance = getFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

const FieldValue = {
  serverTimestamp: () => "SERVER_TIMESTAMP_PLACEHOLDER"
};

class DocRef {
  constructor(private colName: string, private docId: string) {}

  async set(data: any, options?: { merge?: boolean }) {
    const ref = doc(firestoreInstance, this.colName, this.docId);
    const processedData = this.replacePlaceholders(data);
    return setDoc(ref, processedData, { merge: options?.merge ?? false });
  }

  async get() {
    const ref = doc(firestoreInstance, this.colName, this.docId);
    const snap = await getDoc(ref);
    return {
      exists: snap.exists(),
      data: () => snap.data()
    };
  }

  async delete() {
    const ref = doc(firestoreInstance, this.colName, this.docId);
    return deleteDoc(ref);
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
async function startServer() {
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
      const { qid, status, markah, email, nama, sijilBase64 } = req.body;
      
      if (!qid || !email) {
        return res.status(400).json({ error: "Missing required fields (qid, email)" });
      }

      const submissionRef = db.collection('submissions').doc(`${qid}_${email}`);
      
      await submissionRef.set({
        qid,
        status,
        markah: markah !== undefined && markah !== null ? Number(markah) : null,
        email,
        nama,
        sijilBase64: sijilBase64 || null,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({ success: true, message: "Markah berjaya disimpan" });
    } catch (error) {
      console.error("Error submitting score:", error);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

startServer();
export default app;
