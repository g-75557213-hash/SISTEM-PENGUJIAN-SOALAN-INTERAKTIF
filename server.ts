import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const inMemoryClassroomRosters = new Map<string, any>();
const inMemoryNameAliases = new Map<string, any>();

const FieldValue = {
  serverTimestamp: () => "SERVER_TIMESTAMP_PLACEHOLDER"
};

class DocRef {
  colName: string;
  docId: string;

  constructor(colName: string, docId: string) {
    this.colName = colName;
    this.docId = docId;
  }

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
  constraints: QueryConstraint[] = [];
  colName: string;

  constructor(colName: string) {
    this.colName = colName;
  }

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

function normalizeRawName(name: string): string {
  return String(name || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function cleanAliasKey(name: string): string {
  return String(name || '')
    .toUpperCase()
    .replace(/\b(BIN|BINTI|BT|B|ANAK|A\/L|A\/P|MD|MOHD|MUHAMMAD|NUR|NIK|WAN|SITI|ENGKU|CHE)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateFuzzyScore(a: string, b: string): number {
  const normA = cleanAliasKey(a);
  const normB = cleanAliasKey(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 100;
  if (normB.includes(normA) || normA.includes(normB)) return 90;

  const wordsA = normA.split(' ').filter(Boolean);
  const wordsB = normB.split(' ').filter(Boolean);
  const common = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  if (common.length > 0) {
    return Math.round((common.length / Math.max(wordsA.length, wordsB.length)) * 85);
  }
  return 0;
}

async function findStudentAlias(courseId: string | undefined, typedName: string): Promise<any | null> {
  const rawKey = normalizeRawName(typedName);
  if (!rawKey) return null;

  const courseKey = `${courseId || 'ALL'}_${rawKey}`;
  const globalKey = `ALL_${rawKey}`;

  // Check in-memory first
  if (inMemoryNameAliases.has(courseKey)) {
    return inMemoryNameAliases.get(courseKey);
  }
  if (inMemoryNameAliases.has(globalKey)) {
    return inMemoryNameAliases.get(globalKey);
  }

  // Check Firestore
  try {
    const courseDoc = await db.collection("name_aliases").doc(`alias_${courseId || 'ALL'}_${encodeURIComponent(rawKey)}`).get();
    if (courseDoc.exists && courseDoc.data()) {
      const data = courseDoc.data();
      inMemoryNameAliases.set(courseKey, data);
      return data;
    }

    const globalDoc = await db.collection("name_aliases").doc(`alias_ALL_${encodeURIComponent(rawKey)}`).get();
    if (globalDoc.exists && globalDoc.data()) {
      const data = globalDoc.data();
      inMemoryNameAliases.set(globalKey, data);
      return data;
    }
  } catch (err) {
    console.warn("Notice checking alias in Firestore:", err);
  }

  return null;
}

async function saveStudentAlias(courseId: string | undefined, typedName: string, student: { userId: string; fullName: string; email: string }) {
  const rawKey = normalizeRawName(typedName);
  if (!rawKey) return;

  const aliasRecord = {
    rawTypedName: rawKey,
    courseId: courseId || '',
    userId: student.userId,
    fullName: String(student.fullName).trim().toUpperCase(),
    email: (student.email || '').trim().toLowerCase(),
    confirmedAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
  };

  const courseKey = `${courseId || 'ALL'}_${rawKey}`;
  const globalKey = `ALL_${rawKey}`;

  inMemoryNameAliases.set(courseKey, aliasRecord);
  inMemoryNameAliases.set(globalKey, aliasRecord);

  try {
    await db.collection("name_aliases").doc(`alias_${courseId || 'ALL'}_${encodeURIComponent(rawKey)}`).set(aliasRecord, { merge: true });
    await db.collection("name_aliases").doc(`alias_ALL_${encodeURIComponent(rawKey)}`).set(aliasRecord, { merge: true });
  } catch (err) {
    console.warn("Notice saving alias to Firestore:", err);
  }
}

// ==========================================
// GEMINI API KEY POOL & CYCLE (ROTATION) ENGINE
// ==========================================
let adminConfiguredGeminiKeys: string[] = [];
let geminiKeyCycleIndex = 0;

function parseRawKeys(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(k => String(k).trim()).filter(k => k.length > 5);
  }
  const str = String(input);
  return str
    .split(/[\n,\r\s;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 5);
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "******";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

function getAllAvailableGeminiKeys(extraKeys?: any): { key: string; source: 'env' | 'admin'; masked: string }[] {
  const result: { key: string; source: 'env' | 'admin'; masked: string }[] = [];
  const seen = new Set<string>();

  // 1. Kunci yang dihantar terus dari klien/localStorage (Keutamaan Tertinggi)
  if (extraKeys) {
    const extraList = parseRawKeys(extraKeys);
    for (const k of extraList) {
      if (!seen.has(k)) {
        seen.add(k);
        result.push({ key: k, source: 'admin', masked: maskApiKey(k) });
      }
    }
  }

  // 2. Dari Admin Configured Keys (UI Admin Panel di memori pelayan)
  for (const k of adminConfiguredGeminiKeys) {
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ key: k, source: 'admin', masked: maskApiKey(k) });
    }
  }

  // 3. Dari process.env.GEMINI_API_KEYS
  const envKeysList = parseRawKeys(process.env.GEMINI_API_KEYS);
  for (const k of envKeysList) {
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ key: k, source: 'env', masked: maskApiKey(k) });
    }
  }

  // 4. Dari process.env.GEMINI_API_KEY
  const defaultEnvKeys = parseRawKeys(process.env.GEMINI_API_KEY);
  for (const k of defaultEnvKeys) {
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ key: k, source: 'env', masked: maskApiKey(k) });
    }
  }

  return result;
}

async function loadStoredGeminiKeys() {
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
    const docSnap: any = await Promise.race([
      db.collection("admin_settings").doc("gemini_keys").get(),
      timeoutPromise
    ]);
    if (docSnap && docSnap.exists && docSnap.data()) {
      const data = docSnap.data();
      if (Array.isArray(data.keys)) {
        adminConfiguredGeminiKeys = parseRawKeys(data.keys);
        console.log(`[Gemini Pool] Berjaya memuatkan ${adminConfiguredGeminiKeys.length} kunci API dari pangkalan data.`);
      }
    }
  } catch (err) {
    console.warn("Notice loading stored Gemini keys:", err);
  }
}
loadStoredGeminiKeys();

async function callGeminiWithRotation<T>(
  action: (ai: GoogleGenAI, apiKey: string, keyInfo: { index: number; total: number; masked: string }) => Promise<T>,
  extraKeys?: any
): Promise<{ result: T; keyUsed: string; keyIndex: number; totalKeys: number }> {
  const pool = getAllAvailableGeminiKeys(extraKeys);
  if (pool.length === 0) {
    throw new Error("Tiada GEMINI_API_KEY ditemui dalam sistem atau panel Admin. Sila masukkan sekurang-kurangnya satu kunci API di Panel Pentadbiran (Admin).");
  }

  const totalKeys = pool.length;
  const startIndex = geminiKeyCycleIndex % totalKeys;
  let lastError: any = null;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const currentIndex = (startIndex + attempt) % totalKeys;
    const currentItem = pool[currentIndex];
    const apiKey = currentItem.key;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      console.log(`[Gemini Cycle] Menjalankan panggilan AI guna Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked})...`);
      
      const result = await action(ai, apiKey, {
        index: currentIndex,
        total: totalKeys,
        masked: currentItem.masked
      });

      // Beralih secara kitaran (Round-Robin Cycle) untuk permintaan berikutnya
      geminiKeyCycleIndex = (currentIndex + 1) % totalKeys;

      return {
        result,
        keyUsed: currentItem.masked,
        keyIndex: currentIndex + 1,
        totalKeys
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      console.warn(`[Gemini Cycle] Kunci #${currentIndex + 1}/${totalKeys} (${currentItem.masked}) gagal: ${errMsg}`);

      if (attempt < totalKeys - 1) {
        console.warn(`[Gemini Cycle] Auto-failover: Berpindah ke kunci seterusnya (${currentIndex + 2}/${totalKeys})...`);
        continue;
      }
    }
  }

  throw lastError || new Error("Semua Kunci API dalam kitaran telah dicuba tetapi gagal.");
}

export const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' })); // Allow large payloads for base64 certificates

  // Admin API Routes for Gemini Key Cycling (Menyokong laluan /api/... dan laluan terus Vercel)
  app.get(["/api/admin/gemini-keys", "/admin/gemini-keys"], async (req, res) => {
    try {
      const pool = getAllAvailableGeminiKeys();
      const currentActiveIndex = pool.length > 0 ? (geminiKeyCycleIndex % pool.length) : 0;
      return res.status(200).json({
        success: true,
        totalKeys: pool.length,
        currentActiveIndex: currentActiveIndex + 1,
        rawKeysText: adminConfiguredGeminiKeys.join("\n"),
        keys: pool.map((item, idx) => ({
          id: idx + 1,
          masked: item.masked,
          source: item.source === 'env' ? 'Fail Persekitaran (.env)' : 'Panel Pentadbiran (Admin)',
          isNext: idx === currentActiveIndex
        }))
      });
    } catch (err: any) {
      return res.status(200).json({ success: true, totalKeys: 0, currentActiveIndex: 1, rawKeysText: "", keys: [] });
    }
  });

  app.post(["/api/admin/gemini-keys", "/admin/gemini-keys"], async (req, res) => {
    try {
      const { keys } = req.body || {};
      const parsed = parseRawKeys(keys);

      if (parsed.length > 0) {
        adminConfiguredGeminiKeys = parsed;
      }

      // Best effort save to Firestore with strict 1.5s timeout so it NEVER blocks Vercel / serverless
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
        await Promise.race([
          db.collection("admin_settings").doc("gemini_keys").set({
            keys: parsed,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true }),
          timeoutPromise
        ]);
      } catch (dbErr) {
        console.warn("Notice saving gemini_keys to Firestore:", dbErr);
      }

      const pool = getAllAvailableGeminiKeys(parsed);
      return res.status(200).json({
        success: true,
        message: `Berjaya mengemas kini ${parsed.length} Kunci API Gemini ke dalam kitaran pelayan!`,
        totalKeys: pool.length,
        currentActiveIndex: pool.length > 0 ? (geminiKeyCycleIndex % pool.length) + 1 : 0,
        keys: pool.map((item, idx) => ({
          id: idx + 1,
          masked: item.masked,
          source: item.source === 'env' ? 'Fail Persekitaran (.env)' : 'Panel Pentadbiran (Admin)'
        }))
      });
    } catch (err: any) {
      console.error("Error in gemini-keys save endpoint:", err);
      return res.status(200).json({
        success: true,
        message: "Kunci API berjaya disimpan.",
        totalKeys: adminConfiguredGeminiKeys.length,
        currentActiveIndex: 1,
        keys: []
      });
    }
  });

  app.post(["/api/admin/test-gemini-key", "/admin/test-gemini-key"], async (req, res) => {
    try {
      const { keys } = req.body || {};
      let keysToTest: { key: string; source: string; masked: string }[] = [];

      // If user passed keys directly in request body, parse and test them
      if (keys && typeof keys === 'string' && keys.trim()) {
        const parsed = parseRawKeys(keys);
        keysToTest = parsed.map((k) => ({
          key: k,
          source: 'Panel Pentadbiran (Admin)',
          masked: maskApiKey(k)
        }));
      }

      // If no keys in body, fallback to all available keys in system
      if (keysToTest.length === 0) {
        keysToTest = getAllAvailableGeminiKeys();
      }

      if (keysToTest.length === 0) {
        return res.status(200).json({ 
          success: false, 
          error: "Tiada kunci API Gemini dimasukkan. Sila taip atau tampal kunci API dalam ruangan kotak teks terlebih dahulu." 
        });
      }

      // Test all keys concurrently in parallel with strict 5-second timeout to avoid any server gateway timeouts
      const testPromises = keysToTest.map(async (item, i) => {
        try {
          const ai = new GoogleGenAI({
            apiKey: item.key,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          // Timeout 5 seconds per key
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Masa tamat sambungan (Timeout > 5s). Sila semak sambungan internet anda.")), 5000);
          });

          const resp = await Promise.race([
            ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: "Sahkan sambungan: balas OK.",
            }),
            timeoutPromise
          ]);

          return {
            id: i + 1,
            masked: item.masked,
            source: item.source,
            status: 'Aktif & Sah (Token Berfungsi)',
            success: true,
            sample: resp.text?.slice(0, 30) || 'OK'
          };
        } catch (testErr: any) {
          const rawErr = String(testErr?.message || testErr);
          let userFriendlyStatus = 'Ralat Kunci / Kuota';

          if (rawErr.includes("API_KEY_INVALID") || rawErr.includes("API key not valid")) {
            userFriendlyStatus = 'Kunci Tidak Sah (Invalid API Key)';
          } else if (rawErr.includes("PERMISSION_DENIED") || rawErr.includes("billing")) {
            userFriendlyStatus = 'Sekatan Projek / Perlu Billing';
          } else if (rawErr.includes("RESOURCE_EXHAUSTED") || rawErr.includes("429") || rawErr.includes("quota")) {
            userFriendlyStatus = 'Kuota Harian Habis (Rate Limit 429)';
          } else if (rawErr.includes("Timeout")) {
            userFriendlyStatus = 'Sambungan Perlahan (Timeout)';
          }

          return {
            id: i + 1,
            masked: item.masked,
            source: item.source,
            status: userFriendlyStatus,
            success: false,
            error: rawErr.slice(0, 150)
          };
        }
      });

      const results = await Promise.all(testPromises);

      return res.status(200).json({
        success: true,
        totalTested: results.length,
        results
      });
    } catch (err: any) {
      console.error("Error testing Gemini keys:", err);
      return res.status(200).json({ 
        success: false, 
        error: err.message || "Ralat pelayan semasa menguji kunci" 
      });
    }
  });

  // API Routes
  app.post(["/api/generate-game", "/generate-game"], async (req, res) => {
    try {
      const { idea, mode, topic, gradeLevel, keys: clientKeys } = req.body;
      if (!idea) {
        return res.status(400).json({ error: "Sila berikan idea permainan/simulasi" });
      }

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

      const { result: response, keyUsed, keyIndex, totalKeys } = await callGeminiWithRotation(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });
      }, clientKeys);

      const text = response.text || "{}";
      const jsonResult = JSON.parse(text);
      res.json({
        ...jsonResult,
        keyUsed,
        keyIndex,
        totalKeys
      });
    } catch (err: any) {
      console.error("Gagal menjana permainan dengan Gemini API:", err);
      res.status(500).json({ error: err.message || "Gagal menjana permainan dengan Gemini AI" });
    }
  });

  // Endpoint Penjanaan 1-Klik Soalan Interaktif menggunakan Gemini API dengan Kitaran Kunci (Key Cycling)
  app.post(["/api/generate-question", "/generate-question"], async (req, res) => {
    try {
      const { prompt, keys: clientKeys } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Sila berikan prompt untuk penjanaan soalan" });
      }

      const systemInstruction = `Anda ialah pakar pembina web interaktif gamifikasi pendidikan KSSM Malaysia bertaraf dunia.
Tugas anda adalah menjana kod HTML5 lengkap (single-file HTML) berserta CSS (Tailwind CDN https://cdn.tailwindcss.com) dan JavaScript fungsional mengikut arahan prompt pengguna.
Syarat WAJIB:
1. Menghasilkan satu fail HTML yang lengkap dan bersedia untuk diuji serta-merta di dalam iframe.
2. Sertakan sistem gamifikasi seperti skor, animasi butang, interaktiviti visual responsif, dan nyawa (hearts) mengikut jumlah yang diminta dalam prompt.
3. Gunakan Web Audio API sintetik (synthesizer) untuk kesan bunyi atau muzik latar tanpa pautan fail audio luar.
4. MESTI sertakan fungsi penyerahan markah:
function tamatkanPermainan(markahAkhir) {
  if (typeof window.hantarMarkahKeSistem === 'function') {
    window.hantarMarkahKeSistem(markahAkhir);
  } else {
    alert("Permainan Tamat! Markah anda: " + markahAkhir + "%");
  }
}
Dan panggil fungsi ini sebaik sahaja pemain tamat menjawab atau kehabisan nyawa.
5. PULANGKAN KOD HTML SAHAJA. Mulakan terus dengan <!DOCTYPE html> hingga </html>. Jangan letakkan teks sembang sebelum atau selepas kod.`;

      const { result: response, keyUsed, keyIndex, totalKeys } = await callGeminiWithRotation(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            systemInstruction,
          }
        });
      }, clientKeys);

      let rawText = response.text || "";
      let htmlCode = rawText;

      // Extract HTML from code block if model wrapped it in ```html ... ```
      if (rawText.includes("```html")) {
        const match = rawText.match(/```html\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          htmlCode = match[1];
        }
      } else if (rawText.includes("```")) {
        const match = rawText.match(/```\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          htmlCode = match[1];
        }
      }

      htmlCode = htmlCode.trim();

      if (!htmlCode) {
        return res.status(500).json({ error: "Gemini AI tidak memulangkan kod HTML yang sah. Sila cuba lagi." });
      }

      res.json({
        success: true,
        html: htmlCode,
        keyUsed,
        keyIndex,
        totalKeys,
        message: `Soalan interaktif berjaya dijana secara automatik oleh Gemini AI (Kunci #${keyIndex}/${totalKeys} [${keyUsed}])!`
      });
    } catch (err: any) {
      console.error("Gagal menjana soalan dengan Gemini API:", err);
      res.status(500).json({ error: err.message || "Ralat semasa menghubungi Gemini AI API" });
    }
  });

  // Classroom Roster Cache Endpoints
  app.post("/api/classroom-roster", async (req, res) => {
    try {
      const { courseId, courseName, students } = req.body;
      if (!courseId || !Array.isArray(students)) {
        return res.status(400).json({ error: "Missing required fields (courseId, students)" });
      }

      const rosterData = {
        courseId: String(courseId).trim(),
        courseName: courseName ? String(courseName).trim() : '',
        students: students.map((s: any) => ({
          userId: s.userId || s.id || '',
          fullName: (s.profile?.name?.fullName || s.fullName || s.name || '').trim().toUpperCase(),
          email: (s.profile?.emailAddress || s.email || '').trim().toLowerCase(),
          photoUrl: s.profile?.photoUrl || s.photoUrl || ''
        })),
        updatedAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
      };

      inMemoryClassroomRosters.set(rosterData.courseId, rosterData);

      try {
        const rosterRef = db.collection('classroom_rosters').doc(rosterData.courseId);
        await rosterRef.set({
          ...rosterData,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore save notice for classroom_roster:", dbErr);
      }

      return res.json({ success: true, count: rosterData.students.length });
    } catch (error) {
      console.error("Error caching classroom roster:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/classroom-roster", async (req, res) => {
    try {
      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ error: "Missing courseId" });
      }

      const cleanCourseId = String(courseId).trim();
      let roster = inMemoryClassroomRosters.get(cleanCourseId);

      if (!roster) {
        try {
          const docSnap = await db.collection('classroom_rosters').doc(cleanCourseId).get();
          if (docSnap.exists && docSnap.data()) {
            roster = docSnap.data();
            inMemoryClassroomRosters.set(cleanCourseId, roster);
          }
        } catch (dbErr) {
          console.warn("Firestore fetch notice for classroom_roster:", dbErr);
        }
      }

      if (!roster) {
        return res.status(404).json({ error: "Roster not found for course", students: [] });
      }

      return res.json(roster);
    } catch (error) {
      console.error("Error getting classroom roster:", error);
      res.status(500).json({ error: "Internal server error", students: [] });
    }
  });

  app.post("/api/submit-score", async (req, res) => {
    try {
      const { 
        qid, 
        status, 
        markah, 
        email, 
        nama, 
        sijilBase64, 
        isUmum, 
        kod, 
        kelas,
        courseId,
        courseWorkId,
        rawTypedName,
        matchedClassroomName,
        matchedStudentId,
        verificationStatus,
        possibleMatches,
        mod
      } = req.body;
      
      const isGCMode = mod === 'gc' || !!courseId;

      // For Google Classroom submissions
      if (isGCMode) {
        const rawName = String(rawTypedName || nama || 'PELAJAR').trim().toUpperCase();

        // 1. Check if there is an existing confirmed alias for this short name
        const existingAlias = await findStudentAlias(courseId, rawName);

        let studentName: string;
        let safeStudentId: string;
        let finalEmail: string;
        let finalVerificationStatus: string;
        let autoMapped = false;

        if (existingAlias) {
          // Previously confirmed by teacher! Auto-register directly without teacher confirmation!
          studentName = existingAlias.fullName;
          safeStudentId = existingAlias.userId;
          finalEmail = existingAlias.email || (email ? String(email).trim().toLowerCase() : '');
          finalVerificationStatus = 'verified';
          autoMapped = true;
        } else if (verificationStatus === 'verified' && matchedStudentId) {
          // Pre-verified by Delima Chrome account detection or exact match
          studentName = String(matchedClassroomName || nama || rawName).trim().toUpperCase();
          safeStudentId = matchedStudentId;
          finalEmail = email ? String(email).trim().toLowerCase() : '';
          finalVerificationStatus = 'verified';
          autoMapped = false;
        } else {
          // Short name entered manually by student and not yet approved by teacher:
          // ALWAYS RECORD SCORE IMMEDIATELY!
          studentName = rawName;
          safeStudentId = matchedStudentId || encodeURIComponent(rawName);
          finalEmail = email ? String(email).trim().toLowerCase() : '';
          finalVerificationStatus = 'pending_teacher_approval';
          autoMapped = false;
        }

        // Determine possible candidate matches if pending teacher approval
        let finalPossibleMatches = Array.isArray(possibleMatches) ? possibleMatches : [];
        if (finalVerificationStatus === 'pending_teacher_approval' && finalPossibleMatches.length === 0 && courseId) {
          const roster = inMemoryClassroomRosters.get(String(courseId).trim());
          if (roster && Array.isArray(roster.students)) {
            finalPossibleMatches = roster.students
              .map((st: any) => {
                const fullName = st.profile?.name?.fullName || st.fullName || '';
                const score = calculateFuzzyScore(rawName, fullName);
                return {
                  userId: st.userId,
                  fullName,
                  email: st.profile?.emailAddress || st.email || '',
                  score
                };
              })
              .filter((m: any) => m.score >= 45)
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 5);
          }
        }

        const docId = `gc_${courseId || 'GC'}_${safeStudentId}_${qid || 'QUIZ'}`;

        const dataToSave = {
          id: docId,
          qid: qid || '',
          kod: kod ? String(kod).trim().toUpperCase() : '',
          kelas: kelas || '',
          courseId: courseId ? String(courseId).trim() : '',
          courseWorkId: courseWorkId ? String(courseWorkId).trim() : '',
          nama: studentName,
          rawTypedName: rawName,
          matchedClassroomName: studentName,
          matchedStudentId: safeStudentId,
          email: finalEmail,
          status: status || 'Selesai Menjawab',
          markah: markah !== undefined && markah !== null ? Number(markah) : null,
          verificationStatus: finalVerificationStatus,
          possibleMatches: finalPossibleMatches,
          autoMapped,
          sijilBase64: sijilBase64 || null,
          isUmum: false,
          isClassroom: true,
          source: 'Google Classroom',
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
          console.warn("Firestore save notice for GC submission (saved to memory):", dbErr);
        }

        return res.json({ 
          success: true, 
          message: autoMapped 
            ? "Markah murid berjaya dikemaskini terus mengikut padanan nama Google Classroom yang telah disahkan."
            : "Markah murid berjaya direkodkan serta-merta.",
          autoMapped,
          verificationStatus: dataToSave.verificationStatus,
          submissionId: docId
        });
      }

      // For Tugasan Umum (tanpa GC), email is optional, but nama and (qid or kod) are required
      if (isUmum || kod) {
        if (!nama || (!qid && !kod)) {
          return res.status(400).json({ error: "Missing required fields (nama, qid or kod)" });
        }
        const safeNama = encodeURIComponent(String(nama).trim().toUpperCase());
        const safeKod = kod ? String(kod).trim().toUpperCase() : (qid || 'UMUM');
        const docId = `umum_${safeKod}_${safeNama}`;

        const dataToSave = {
          id: docId,
          qid: qid || '',
          kod: kod ? String(kod).trim().toUpperCase() : '',
          kelas: kelas || '',
          nama: String(nama).trim().toUpperCase(),
          status: status || 'Selesai',
          markah: markah !== undefined && markah !== null ? Number(markah) : null,
          email: email || '',
          sijilBase64: sijilBase64 || null,
          isUmum: true,
          source: 'Tugasan Umum',
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

      const docId = `${qid}_${email}`;
      const dataToSave = {
        id: docId,
        qid,
        status: status || 'Selesai',
        markah: markah !== undefined && markah !== null ? Number(markah) : null,
        email,
        nama: nama || '',
        sijilBase64: sijilBase64 || null,
        isUmum: false,
        verificationStatus: 'verified',
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
        console.warn("Firestore save notice for submission:", dbErr);
      }

      res.json({ success: true, message: "Markah berjaya disimpan" });
    } catch (error) {
      console.error("Error submitting score:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoints to manage student verification by teachers
  app.get("/api/pending-verifications", async (req, res) => {
    try {
      const { courseId, qid } = req.query;
      const pendingMap = new Map<string, any>();

      inMemorySubmissions.forEach((val, key) => {
        if (val.verificationStatus === 'pending_teacher_approval') {
          let match = true;
          if (courseId && val.courseId && val.courseId !== courseId) match = false;
          if (qid && val.qid && val.qid !== qid) match = false;
          if (match) pendingMap.set(key, { ...val, id: key });
        }
      });

      try {
        let queryRef: any = db.collection("submissions").where("verificationStatus", "==", "pending_teacher_approval");
        if (courseId) {
          queryRef = queryRef.where("courseId", "==", String(courseId));
        }
        const snapshot = await queryRef.get();
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          if (data) {
            pendingMap.set(doc.id, { ...data, id: doc.id });
          }
        });
      } catch (dbErr) {
        console.warn("Firestore fetch notice for pending verifications:", dbErr);
      }

      res.json(Array.from(pendingMap.values()));
    } catch (error) {
      console.error("Error getting pending verifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/verify-student-submission", async (req, res) => {
    try {
      const { submissionId, action, confirmedStudent } = req.body;
      if (!submissionId || !action) {
        return res.status(400).json({ error: "Missing required fields (submissionId, action)" });
      }

      if (action === 'delete') {
        // Discard / Delete submission entirely from system
        inMemorySubmissions.delete(submissionId);
        try {
          await db.collection("submissions").doc(submissionId).delete();
        } catch (dbErr) {
          console.warn("Firestore delete submission notice:", dbErr);
        }
        return res.json({ success: true, message: "Cubaan jawab murid berjaya dibuang dari sistem." });
      }

      if (action === 'confirm') {
        if (!confirmedStudent || !confirmedStudent.fullName) {
          return res.status(400).json({ error: "Missing confirmedStudent details" });
        }

        const existing = inMemorySubmissions.get(submissionId) || {};
        const rawName = String(existing.rawTypedName || existing.nama || '').trim().toUpperCase();

        // 1. Permanently register alias so future short-name submissions are auto-mapped directly
        await saveStudentAlias(existing.courseId, rawName, {
          userId: confirmedStudent.userId,
          fullName: confirmedStudent.fullName,
          email: confirmedStudent.email || existing.email || ''
        });

        const updated = {
          ...existing,
          verificationStatus: 'verified',
          nama: String(confirmedStudent.fullName).trim().toUpperCase(),
          matchedClassroomName: String(confirmedStudent.fullName).trim().toUpperCase(),
          matchedStudentId: confirmedStudent.userId || existing.matchedStudentId || '',
          email: (confirmedStudent.email || existing.email || '').trim().toLowerCase(),
          updatedAt: new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
        };

        inMemorySubmissions.set(submissionId, updated);

        // Also if we have a student-id specific docId, save under that key too
        const studentDocId = `gc_${existing.courseId || 'GC'}_${confirmedStudent.userId}_${existing.qid || 'QUIZ'}`;
        if (studentDocId !== submissionId) {
          inMemorySubmissions.set(studentDocId, { ...updated, id: studentDocId });
        }

        try {
          await db.collection("submissions").doc(submissionId).set({
            ...updated,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          if (studentDocId !== submissionId) {
            await db.collection("submissions").doc(studentDocId).set({
              ...updated,
              id: studentDocId,
              updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
          }
        } catch (dbErr) {
          console.warn("Firestore update submission notice:", dbErr);
        }

        return res.json({ 
          success: true, 
          message: `Murid berjaya disahkan dan nama "${rawName}" telah didaftarkan ke Google Classroom untuk pengemaskinian markah automatik.`,
          updated
        });
      }

      return res.status(400).json({ error: "Invalid action" });
    } catch (error) {
      console.error("Error verifying student submission:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check alias endpoint for client-side auto-resolution
  app.get("/api/check-alias", async (req, res) => {
    try {
      const { courseId, name } = req.query;
      if (!name) return res.json({ found: false });
      const alias = await findStudentAlias(courseId as string, name as string);
      if (alias) {
        return res.json({ found: true, alias });
      }
      return res.json({ found: false });
    } catch (e) {
      return res.json({ found: false });
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
      const { guruEmail, guruNama, qid } = req.query;
      const resultsMap = new Map<string, any>();

      // Seed with in-memory store
      inMemoryTugasanUmum.forEach((val, key) => {
        let match = true;
        if (guruEmail && val.guruEmail && val.guruEmail !== guruEmail) match = false;
        if (guruNama && val.guruNama && !val.guruNama.toLowerCase().includes(String(guruNama).toLowerCase())) match = false;
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
          if (guruNama && data.guruNama && !data.guruNama.toLowerCase().includes(String(guruNama).toLowerCase())) {
            return;
          }
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
      const { qid, kelas } = req.query;
      if (!kod) return res.status(400).json({ error: "Missing kod" });
      const cleanKod = kod.toUpperCase().trim();
      const cleanQid = qid ? String(qid).toUpperCase().trim() : '';
      const cleanKelas = kelas ? String(kelas).toUpperCase().trim() : '';

      inMemoryTugasanUmum.delete(cleanKod);
      try {
        await db.collection("tugasan_umum").doc(cleanKod).delete();
      } catch (dbErr) {
        console.warn("Firestore delete notice:", dbErr);
      }

      // Also clean up any associated student submissions for this kod
      for (const [key, val] of inMemorySubmissions.entries()) {
        const valKod = (val.kod || '').toUpperCase().trim();
        const valQid = (val.qid || '').toUpperCase().trim();
        const valKelas = (val.kelas || '').toUpperCase().trim();

        let match = false;
        if (valKod === cleanKod || key.includes(cleanKod)) match = true;
        else if (cleanQid && valQid === cleanQid && cleanKelas && valKelas === cleanKelas) match = true;

        if (match) {
          inMemorySubmissions.delete(key);
        }
      }

      try {
        const subSnap = await db.collection("submissions").where("kod", "==", cleanKod).get();
        if (subSnap.docs && subSnap.docs.length > 0) {
          await Promise.all(subSnap.docs.map(d => db.collection("submissions").doc(d.id).delete()));
        }
        if (cleanQid && cleanKelas) {
          const subSnapQ = await db.collection("submissions")
            .where("qid", "==", cleanQid)
            .where("kelas", "==", cleanKelas)
            .get();
          if (subSnapQ.docs && subSnapQ.docs.length > 0) {
            await Promise.all(subSnapQ.docs.map(d => db.collection("submissions").doc(d.id).delete()));
          }
        }
      } catch (dbErr) {
        console.warn("Firestore delete submissions notice:", dbErr);
      }

      res.json({ success: true, message: "Tugasan umum dan markah murid berkaitan berjaya dipadam" });
    } catch (error) {
      console.error("Error deleting tugasan umum:", error);
      res.json({ success: true, message: "Tugasan umum dipadam secara tempatan" });
    }
  });

  app.post("/api/delete-classroom-assignment", async (req, res) => {
    try {
      const { courseId, courseWorkId, qid, kod, email, assignmentTitle } = req.body;
      const cleanCourseId = (courseId || '').trim();
      const cleanCourseWorkId = (courseWorkId || '').trim();
      const cleanQid = (qid || '').trim().toUpperCase();
      const cleanKod = (kod || '').trim().toUpperCase();
      const cleanTitle = (assignmentTitle || '').trim().toUpperCase();

      // 1. Delete from inMemorySubmissions
      for (const [key, val] of inMemorySubmissions.entries()) {
        const valCourseId = (val.courseId || '').trim();
        const valCourseWorkId = (val.courseWorkId || '').trim();
        const valQid = (val.qid || '').trim().toUpperCase();
        const valKod = (val.kod || '').trim().toUpperCase();
        const valTugasan = (val.tugasan || '').trim().toUpperCase();

        let match = false;
        if (cleanCourseId && cleanCourseWorkId && valCourseId === cleanCourseId && valCourseWorkId === cleanCourseWorkId) match = true;
        else if (cleanCourseWorkId && (valCourseWorkId === cleanCourseWorkId || key.includes(cleanCourseWorkId))) match = true;
        else if (cleanKod && valKod === cleanKod) match = true;
        else if (cleanCourseId && cleanQid && valCourseId === cleanCourseId && valQid === cleanQid) match = true;
        else if (cleanTitle && valTugasan === cleanTitle) match = true;

        if (match) {
          inMemorySubmissions.delete(key);
        }
      }

      // 2. Delete from Firestore submissions collection
      try {
        if (cleanCourseId && cleanCourseWorkId) {
          const snap = await db.collection("submissions")
            .where("courseId", "==", cleanCourseId)
            .where("courseWorkId", "==", cleanCourseWorkId)
            .get();
          if (snap.docs && snap.docs.length > 0) {
            await Promise.all(snap.docs.map(d => db.collection("submissions").doc(d.id).delete()));
          }
        }
        if (cleanCourseId && cleanQid) {
          const snap = await db.collection("submissions")
            .where("courseId", "==", cleanCourseId)
            .where("qid", "==", cleanQid)
            .get();
          if (snap.docs && snap.docs.length > 0) {
            await Promise.all(snap.docs.map(d => db.collection("submissions").doc(d.id).delete()));
          }
        }
        if (cleanKod) {
          const snap = await db.collection("submissions")
            .where("kod", "==", cleanKod)
            .get();
          if (snap.docs && snap.docs.length > 0) {
            await Promise.all(snap.docs.map(d => db.collection("submissions").doc(d.id).delete()));
          }
        }
      } catch (dbErr) {
        console.warn("Firestore delete submissions notice:", dbErr);
      }

      // 3. Update assignment_status if qid and email exist
      try {
        if (cleanQid && email) {
          const docRef = db.collection("assignment_status").doc(`${cleanQid}_${email}`);
          const docSnapshot = await docRef.get();
          if (docSnapshot.exists) {
            const data = docSnapshot.data();
            const assignments = data?.assignments || [];
            const updatedAssignments = assignments.filter((a: any) => 
              a.courseId !== cleanCourseId && 
              a.assignmentId !== cleanCourseWorkId && 
              a.courseWorkId !== cleanCourseWorkId
            );
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
        }
      } catch (statusErr) {
        console.warn("Notice updating assignment_status:", statusErr);
      }

      return res.json({ 
        success: true, 
        message: "Tugasan Google Classroom dan rekod markah berjaya dipadam dari sistem." 
      });
    } catch (err: any) {
      console.error("Error in /api/delete-classroom-assignment:", err);
      res.status(500).json({ error: "Gagal memadam tugasan dari pelayan: " + err.message });
    }
  });

  app.delete("/api/tugasan-umum-submissions", async (req, res) => {
    try {
      const { kod, nama } = req.query;
      if (!kod || !nama) return res.status(400).json({ error: "Missing kod or nama" });
      const cleanKod = String(kod).toUpperCase().trim();
      const cleanNama = String(nama).toUpperCase().trim();

      for (const [key, val] of inMemorySubmissions.entries()) {
        if ((val.kod || '').toUpperCase().trim() === cleanKod && (val.nama || '').toUpperCase().trim() === cleanNama) {
          inMemorySubmissions.delete(key);
        }
      }

      try {
        const subSnap = await db.collection("submissions")
          .where("kod", "==", cleanKod)
          .where("nama", "==", cleanNama)
          .get();
        if (subSnap.docs && subSnap.docs.length > 0) {
          await Promise.all(subSnap.docs.map(d => db.collection("submissions").doc(d.id).delete()));
        }
      } catch (dbErr) {
        console.warn("Firestore delete single submission notice:", dbErr);
      }

      res.json({ success: true, message: "Rekod markah murid berjaya dipadam" });
    } catch (err) {
      console.error("Error deleting submission:", err);
      res.status(500).json({ error: "Failed to delete submission" });
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
      const { qid, courseId } = req.query;
      const subsMap = new Map<string, any>();

      inMemorySubmissions.forEach((val, key) => {
        let match = true;
        if (qid && val.qid !== qid) match = false;
        if (courseId && val.courseId !== courseId) match = false;
        if (match) subsMap.set(key, { ...val, id: key });
      });

      try {
        let q: any = db.collection("submissions");
        if (qid) q = q.where("qid", "==", String(qid));
        if (courseId) q = q.where("courseId", "==", String(courseId));
        const snapshot = await q.get();
        snapshot.forEach((doc: any) => {
          const d = doc.data();
          if (d) subsMap.set(doc.id, { ...d, id: doc.id });
        });
      } catch (err) {
        console.warn("Notice fetching submissions:", err);
      }

      res.json(Array.from(subsMap.values()));
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

  app.post("/api/update-question-link", async (req, res) => {
    try {
      const { idSoalan, linkSoalan } = req.body;
      if (!idSoalan) {
        return res.status(400).json({ error: "Missing idSoalan" });
      }
      await db.collection("questions").doc(String(idSoalan)).set({
        linkSoalan: linkSoalan || "",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      res.json({ success: true, message: "Pautan soalan berjaya dikemaskini" });
    } catch (error) {
      console.error("Error updating question link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  app.get("/api/question", async (req, res) => {
    try {
      const { qid, spreadsheetId } = req.query;
      if (!qid) return res.status(400).json({ error: "Missing qid" });

      const rawQid = String(qid).trim();
      const cleanQid = rawQid.toUpperCase();
      const sheetId = spreadsheetId ? String(spreadsheetId) : "1juPUlz-mCIHeHzp2oy5Uyw8e-cx8b0cHn2uq-oLRS0A";

      // Built-in demo simulations
      if (cleanQid === "SIM_KETUMPATAN" || rawQid === "sim_ketumpatan") {
        return res.json({
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-blue-400 mb-4">Simulasi Ketumpatan</h2><div class="flex flex-col md:flex-row gap-6"><div class="w-full md:w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700"><label class="block text-sm font-bold mb-2">Pilih Cecair:</label><select id="liquid" class="w-full bg-slate-900 p-2 rounded border border-slate-600 mb-4"><option value="1.0">Air (1.0)</option><option value="0.9">Minyak (0.9)</option><option value="1.4">Madu (1.4)</option></select><label class="block text-sm font-bold mb-2">Jatuhkan Bahan:</label><div class="flex gap-2"><button onclick="drop('Gabus', 0.24)" class="flex-1 bg-orange-700 p-2 rounded font-bold">Gabus</button><button onclick="drop('Besi', 7.87)" class="flex-1 bg-slate-500 p-2 rounded font-bold">Besi</button></div><button onclick="resetSim()" class="w-full mt-4 bg-red-600 p-2 rounded font-bold">Reset</button></div><div class="w-full md:w-2/3 h-64 bg-slate-950 rounded-xl relative border border-slate-800 flex justify-center items-end p-8"><div id="beaker" class="w-48 h-56 border-4 border-t-0 border-blue-900 rounded-b-2xl relative overflow-hidden flex flex-col justify-end"><div id="water" class="w-full h-1/2 bg-blue-500/30 border-t-2 border-blue-400"></div><div id="objects" class="absolute inset-0"></div></div></div></div><table class="w-full mt-6 text-sm border border-slate-700"><thead class="bg-slate-800"><tr><th class="p-2 border">Bahan</th><th class="p-2 border">Keputusan</th></tr></thead><tbody id="results"></tbody></table><script>function drop(n,d){const l=parseFloat(document.getElementById('liquid').value);const r=d>l?'Tenggelam':'Terapung';const o=document.createElement('div');o.className='absolute text-xs text-center';o.style.left=(Math.random()*60+20)+'%';o.style.top=r==='Terapung'?'40%':'80%';o.innerHTML='<div class="bg-black/50 px-1 rounded">'+n+'</div><div class="w-8 h-8 rounded '+(n==='Gabus'?'bg-orange-700':'bg-slate-500')+'"></div>';document.getElementById('objects').appendChild(o);const tr=document.createElement('tr');tr.innerHTML='<td class="p-2 border">'+n+'</td><td class="p-2 border">'+r+'</td>';document.getElementById('results').appendChild(tr)}function resetSim(){document.getElementById('objects').innerHTML='';document.getElementById('results').innerHTML=''}</script></body></html>`
        });
      }
      if (cleanQid === "SIM_BANDUL" || rawQid === "sim_bandul") {
        return res.json({
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-6"><h2 class="text-2xl font-bold text-fuchsia-400 mb-4">Bandul Ringkas</h2><div class="flex flex-col md:flex-row gap-6"><div class="w-full md:w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700"><label class="block text-sm mb-1">Panjang: <span id="lenVal">50</span>cm</label><input type="range" id="len" min="20" max="100" value="50" oninput="document.getElementById('lenVal').innerText=this.value" class="w-full mb-4"><button id="btn" onclick="toggle()" class="w-full bg-fuchsia-600 p-3 rounded-xl font-bold">MULA</button><div class="grid grid-cols-2 gap-4 mt-4 text-center"><div class="bg-slate-950 p-2 rounded border border-slate-700"><div class="text-[10px]">MASA (s)</div><div id="time" class="text-xl font-mono text-fuchsia-400">0.00</div></div><div class="bg-slate-950 p-2 rounded border border-slate-700"><div class="text-[10px]">AYUNAN</div><div id="count" class="text-xl font-mono text-emerald-400">0/10</div></div></div></div><div class="w-full md:w-2/3 h-64 bg-slate-950 rounded-xl relative overflow-hidden flex justify-center"><div id="pend" class="absolute top-0 origin-top" style="height:150px"><div class="w-0.5 h-full bg-slate-300 mx-auto"></div><div class="w-6 h-6 bg-pink-500 rounded-full -mt-3 mx-auto"></div></div></div></div><script>let r=false,s,req;function toggle(){const b=document.getElementById('btn');if(r){cancelAnimationFrame(req);r=false;b.innerText='MULA';return}r=true;b.innerText='BERHENTI';s=performance.now();const l=document.getElementById('len').value;const p=2*Math.PI*Math.sqrt(l/100/9.81);function animate(t){const e=(t-s)/1000;const a=-0.5*Math.cos((2*Math.PI/p)*e);document.getElementById('pend').style.transform='rotate('+a+'rad)';document.getElementById('time').innerText=e.toFixed(2);const o=Math.floor(e/p);document.getElementById('count').innerText=Math.min(10,o)+'/10';if(o>=10){r=false;b.innerText='MULA';return}req=requestAnimationFrame(animate)}req=requestAnimationFrame(animate)}</script></body></html>`
        });
      }

      let linkSoalan = "";
      let fallbackHtml = "";

      // 1. First, check Firestore cache
      let docRef = db.collection("questions").doc(cleanQid);
      let docSnap = await docRef.get();
      if (!docSnap.exists && rawQid !== cleanQid) {
        docRef = db.collection("questions").doc(rawQid);
        docSnap = await docRef.get();
      }

      if (docSnap.exists) {
        const docData = docSnap.data();
        linkSoalan = docData?.linkSoalan || "";
        fallbackHtml = docData?.html || "";
      }

      // 2. Fetch the latest row from Google Sheets to get HTML and Column I URL
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`);
        if (response.ok) {
          const text = await response.text();
          const jsonString = text.substring(47, text.length - 2);
          const data = JSON.parse(jsonString);
          
          const rowsData = data.table.rows || [];
          for (const row of rowsData) {
            // Column H (index 7) is ID Soalan
            if (row.c && row.c[7] && row.c[7].v && String(row.c[7].v).trim().toUpperCase() === cleanQid) {
              const sheetLink = row.c[8] ? String(row.c[8].v) : "";
              if (sheetLink && sheetLink.startsWith("http")) {
                linkSoalan = sheetLink;
              }
              // Column G (index 6) is HTML
              let gHtml = row.c[6] && row.c[6].v ? String(row.c[6].v) : "";
              if (row.c.length > 9) {
                for (let j = 9; j < row.c.length; j++) {
                  if (row.c[j] && row.c[j].v) gHtml += String(row.c[j].v);
                }
              }
              if (gHtml) {
                fallbackHtml = gHtml;
              }
              break;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching latest link from Google Sheets inside /api/question:", err);
      }

      // 3. Return full HTML
      if (fallbackHtml && fallbackHtml.trim().length > 20) {
        return res.json({ html: fallbackHtml });
      }

      // 4. Read/fetch the URL created by Apps Script on Column I ONLY if it is a Google Apps Script URL.
      if (linkSoalan && linkSoalan.startsWith("http") && linkSoalan.includes("script.google.com")) {
        try {
          const htmlResponse = await fetch(linkSoalan);
          if (htmlResponse.ok) {
            const htmlContent = await htmlResponse.text();
            
            const isGoogleLogin = htmlContent.includes("accounts.google.com") || 
                                 htmlContent.includes("Service Login") || 
                                 htmlContent.includes("Sign in - Google Accounts");
            
            if (htmlContent && htmlContent.trim().length > 50 && !isGoogleLogin) {
              return res.json({ html: htmlContent });
            }
          }
        } catch (fetchErr) {
          console.error(`Gagal membaca HTML dari URL Column I: ${linkSoalan}`, fetchErr);
        }
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
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).send("Applet is running.");
        }
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
