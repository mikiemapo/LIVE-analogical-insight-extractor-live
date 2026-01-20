import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy } from "firebase/firestore";
import './index.css';


// --- TYPES ---
interface AZ104Question {
  text: string;
  correctAnswer: string;
  explanation?: string;
}

interface ExtractedQuestion {
  id: string;
  text: string;
  correctAnswer: string;
  explanation: string;
}

interface InsightBlock {
  foundationalRule: string;
  whyItWorks: string;
  analogy: string;
  analogousFoundationalConcept: string;
  commonConfusion: string;
  examEliminationCue: string;
  memoryHook: string;
}

interface ExtractionResult {
  domain: string;
  blocks: InsightBlock[];
}

enum ProcessingStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

interface VaultItem {
  hash: string;
  domain: string;
  foundationalRule: string;
  masteredAt: string;
}

// --- SERVICES ---
const COLLECTION_NAME = "az104_master_principles";

const getFirebaseConfig = () => {
  const local = localStorage.getItem('vault_firebase_config');
  return local ? JSON.parse(local) : {
    apiKey: process.env.FIREBASE_API_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
  };
};

const getDb = () => {
  const config = getFirebaseConfig();
  if (!config.projectId) return null;
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return getFirestore(app);
};

const getQuestionHash = async (text: string) => {
  const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
};

// --- COMPONENTS ---
const AnswerExtractor: React.FC<{
  onPush: (q: ExtractedQuestion) => void;
  isApiKeySet: boolean;
  currentCount: number
}> = ({ onPush, isApiKeySet, currentCount }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExtractedQuestion[]>([]);
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [pdfData, setPdfData] = useState<{ name: string, data: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        setLoading(true);
        const base64 = await fileToBase64(file);
        setPdfData({ name: file.name, data: base64 });
        setInput('');
        setError(null);

        // --- DEBUG LOG ---
        console.log("PDF successfully read:", file.name);
        console.log("Base64 length:", base64.length);
        console.log("Gemini Key loaded:", process.env.API_KEY?.slice(0, 6) + "...");

        // Force re-render
        setTimeout(() => {
          setPdfData(prev => prev ? { ...prev } : null);
        }, 50);

      } catch (err) {
        setError("Failed to read PDF file.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else if (file) {
      setError("Please upload a valid PDF document.");
    }
  };

  const isFull = currentCount >= 6;

  const handleExtract = async () => {
    if (!isApiKeySet || (!input.trim() && !pdfData)) return;
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    try {
      const parts: any[] = [{ text: "Extract ONLY correctly answered questions as JSON array: [{id, text, correctAnswer, explanation}]. Max 6 items." }];
      if (pdfData) parts.push({ inlineData: { mimeType: 'application/pdf', data: pdfData.data } });
      else parts.push({ text: input });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || '[]');
      setResults(Array.isArray(data) ? data : []);
      setPushedIds(new Set());
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-full shadow-2xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Answer Scraper</h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${isFull ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-500'}`}>
          STAGED: {currentCount} / 6
        </span>
      </div>

      {!pdfData ? (
        <textarea
          className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 outline-none focus:border-blue-500 mb-4 resize-none"
          placeholder="Paste exam text here..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
      ) : (
        <div className="bg-purple-600/10 border border-purple-500/30 p-4 rounded-xl relative text-center mb-4">
          <button onClick={() => setPdfData(null)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400"><i className="fa-solid fa-xmark"></i></button>
          <i className="fa-solid fa-file-pdf text-2xl text-purple-400 mb-1"></i>
          <p className="text-[10px] font-bold text-white truncate px-4">{pdfData.name}</p>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />

      <div className="flex flex-col gap-2 mb-6">
        {error && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{error}</p>}
        <button onClick={() => fileInputRef.current?.click()} className="py-2 border border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-blue-400 text-[10px] font-bold uppercase transition-colors">Upload PDF</button>
        <button disabled={loading} onClick={handleExtract} className="py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase transition-all shadow-lg">
          {loading ? 'SCRIBING...' : 'EXTRACT VALID ANSWERS'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {(results || []).map((q, i) => {
          const isPushed = pushedIds.has(q.id || q.text);
          const disabled = isPushed || isFull;
          return (
            <div key={i} className={`p-4 bg-slate-950 border rounded-2xl transition-all ${isPushed ? 'border-emerald-500/20 opacity-50' : 'border-slate-800'}`}>
              <p className="text-[10px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">{q.text}</p>
              <button
                disabled={disabled}
                onClick={() => { onPush(q); setPushedIds(prev => new Set(prev).add(q.id || q.text)); }}
                className={`w-full py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isPushed ? 'bg-emerald-500/10 text-emerald-500' :
                  isFull ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white'
                  }`}
              >
                {isPushed ? 'PUSHED' : isFull ? 'LIMIT REACHED (6)' : 'PUSH TO ENGINE'}
              </button>
            </div>
          );
        })}
        {results.length === 0 && !loading && <p className="text-center text-[9px] text-slate-700 uppercase py-8 tracking-widest">No active results</p>}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'gen' | 'vault'>('gen');
  const [staged, setStaged] = useState<ExtractedQuestion[]>([]);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);

  const handlePush = (q: ExtractedQuestion) => {
    setStaged(prev => {
      if (prev.length >= 6) return prev;
      return [...prev, q];
    });
  };

  const handleProcess = async () => {
    if (staged.length === 0) return;
    setStatus(ProcessingStatus.LOADING);
    setErrorMsg(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `You are an AZ-104 Master Class tutor. Convert these correctly answered exam items into core logic principles grounded in official MS Learn docs. Use analogies. Questions: ${JSON.stringify(staged)}` }] },
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              domain: { type: Type.STRING },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    foundationalRule: { type: Type.STRING },
                    whyItWorks: { type: Type.STRING },
                    analogy: { type: Type.STRING },
                    analogousFoundationalConcept: { type: Type.STRING },
                    commonConfusion: { type: Type.STRING },
                    examEliminationCue: { type: Type.STRING },
                    memoryHook: { type: Type.STRING }
                  },
                  required: ["foundationalRule", "whyItWorks", "analogy", "memoryHook"]
                }
              }
            },
            required: ["domain", "blocks"]
          }
        }
      });

      if (!response.text) {
        throw new Error("Logic Engine returned an empty response. This usually happens when safety filters are triggered.");
      }

      const parsed = JSON.parse(response.text.replace(/```json\n?|\n?```/g, '').trim() || '{}');
      setResult(parsed);
      setStatus(ProcessingStatus.SUCCESS);

      const db = getDb();
      if (db) {
        for (const q of staged) {
          const hash = await getQuestionHash(q.text);
          const firstRule = parsed?.blocks?.[0]?.foundationalRule || "AZ-104 Master Principle";
          await setDoc(doc(db, COLLECTION_NAME, hash), {
            hash,
            domain: parsed.domain || "General AZ-104",
            foundationalRule: firstRule,
            masteredAt: new Date().toISOString()
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An unknown error occurred during mining.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  useEffect(() => {
    if (view === 'vault') {
      const db = getDb();
      if (db) {
        const q = query(collection(db, COLLECTION_NAME), orderBy("masteredAt", "desc"));
        getDocs(q).then(snap => setVaultItems(snap.docs.map(d => d.data() as VaultItem))).catch(() => setVaultItems([]));
      }
    }
  }, [view]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col min-h-screen font-sans bg-slate-950">
      <header className="flex justify-between items-center mb-10">
        <div className="group cursor-default">
          <h1 className="text-2xl font-black italic text-white tracking-tighter transition-all group-hover:text-blue-500">
            ANALOGICAL <span className="text-blue-500 group-hover:text-white transition-all">INSIGHT</span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Mastery Engine v2.2 (Flash optimized)</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex shadow-lg">
          <button onClick={() => setView('gen')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${view === 'gen' ? 'bg-blue-600 text-white shadow-blue-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>GEN</button>
          <button onClick={() => setView('vault')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${view === 'vault' ? 'bg-blue-600 text-white shadow-blue-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>VAULT</button>
        </div>
      </header>

      <main className="flex-1">
        {status === ProcessingStatus.ERROR && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 animate-in shake duration-500">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
            <div className="flex-1">
              <p className="text-red-500 font-black text-xs uppercase tracking-widest mb-1">Mining Failed</p>
              <p className="text-red-400/70 text-[11px] font-mono leading-tight">{errorMsg}</p>
            </div>
            <button onClick={() => setStatus(ProcessingStatus.IDLE)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black rounded-lg uppercase transition-all">Retry</button>
          </div>
        )}

        {view === 'gen' ? (
          result ? (
            <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-500">
              <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-black text-blue-500 italic uppercase">{result.domain || "Extracted Principles"}</h2>
                <button onClick={() => { setResult(null); setStaged([]); setStatus(ProcessingStatus.IDLE); }} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors">Discard & Clear</button>
              </div>
              <div className="space-y-8">
                {(result?.blocks || []).map((b, i) => (
                  <div key={i} className="border-l-2 border-blue-600/30 pl-6 group">
                    <h3 className="text-white font-bold mb-2 group-hover:text-blue-400 transition-colors">{b.foundationalRule}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{b.whyItWorks}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-emerald-400 font-black mb-1 uppercase tracking-widest">The Analogy</p>
                        <p className="text-xs text-slate-500 italic leading-relaxed">"{b.analogy}"</p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-amber-400 font-black mb-1 uppercase tracking-widest">Memory Hook</p>
                        <p className="text-xs font-bold text-white italic">"{b.memoryHook}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              <div className="lg:col-span-4 h-full">
                <AnswerExtractor isApiKeySet={!!process.env.API_KEY} currentCount={staged.length} onPush={handlePush} />
              </div>
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex-1 relative shadow-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-6">
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded border ${staged.length >= 6 ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' : 'bg-blue-500/10 text-blue-500 border-blue-500/30'}`}>
                      Staging Area: {staged.length} / 6
                    </span>
                    <button onClick={() => setStaged([])} className="text-[10px] font-bold text-slate-600 hover:text-red-400 uppercase tracking-widest transition-colors">Clear Batch</button>
                  </div>
                  <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {(staged || []).map((s, i) => (
                      <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 group hover:border-blue-500/30 transition-all">
                        <p className="text-[11px] text-slate-300 font-mono leading-relaxed"><span className="text-blue-500 font-bold mr-2">{i + 1}.</span>{s.text}</p>
                      </div>
                    ))}
                    {staged.length === 0 && (
                      <div className="h-60 flex flex-col items-center justify-center opacity-10 font-black uppercase italic tracking-tighter text-center">
                        <i className="fa-solid fa-cube text-6xl mb-4"></i>
                        <p className="text-4xl">Staging Empty</p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  disabled={status === ProcessingStatus.LOADING || staged.length === 0}
                  onClick={handleProcess}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black rounded-3xl shadow-xl transition-all uppercase tracking-widest active:scale-[0.98] shadow-blue-500/10"
                >
                  {status === ProcessingStatus.LOADING ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-microchip animate-spin"></i>
                      Mining Principles (Flash Mode)...
                    </span>
                  ) : 'Analyze & Store Principles'}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-3">
              <i className="fa-solid fa-vault text-blue-500"></i> Mastered Principles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(vaultItems || []).map((v, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all shadow-lg group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black px-2 py-1 bg-blue-500/10 text-blue-400 rounded uppercase tracking-tighter">{v.domain}</span>
                    <span className="text-[8px] text-slate-600 font-mono">{new Date(v.masteredAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-slate-200 font-bold text-sm leading-relaxed mb-4 group-hover:text-white transition-colors">{v.foundationalRule}</h3>
                  <button onClick={() => navigator.clipboard.writeText(v.foundationalRule)} className="text-[9px] font-black text-slate-600 hover:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-copy"></i> Copy Rule
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="mt-20 py-10 border-t border-slate-900 text-center opacity-30">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">AZ-104 MASTER CLASS • LOGIC ENGINE v2.2</p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);