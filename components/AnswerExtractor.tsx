
import React, { useState, useRef } from 'react';
import { cleanAndExtractAnswers } from '../geminiService';
import { ExtractedQuestion } from '../types';

interface AnswerExtractorProps {
  onPush: (q: ExtractedQuestion) => void;
  isApiKeySet: boolean;
  isStagingFull: boolean;
}

const AnswerExtractor: React.FC<AnswerExtractorProps> = ({ onPush, isApiKeySet, isStagingFull }) => {
  const [input, setInput] = useState('');
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExtractedQuestion[]>([]);
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        setLoading(true);
        const base64 = await fileToBase64(file);
        setPdfData(base64);
        setPdfName(file.name);
        setInput('');
        setError(null);
      } catch (err) {
        setError("Failed to read PDF file.");
      } finally {
        setLoading(false);
      }
    } else if (file) {
      setError("Please upload a valid PDF document.");
    }
  };

  const handleExtract = async () => {
    if ((!input.trim() && !pdfData) || !isApiKeySet) return;
    setLoading(true);
    setError(null);
    setPushedIds(new Set());
    try {
      const questions = await cleanAndExtractAnswers(input, pdfData || undefined);
      setResults(questions);
    } catch (err: any) {
      setError(err.message || "Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePushClick = (q: ExtractedQuestion) => {
    if (isStagingFull) return;
    onPush(q);
    setPushedIds(prev => new Set(prev).add(q.id || q.text));
  };

  const clearStagedFile = () => {
    setPdfData(null);
    setPdfName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl backdrop-blur-md">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-purple-600/5">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-broom-wide text-purple-400"></i>
          <span className="text-xs font-black uppercase tracking-widest text-slate-200">Answer Scraper</span>
        </div>
        <i className="fa-solid fa-cloud-arrow-up text-slate-600"></i>
      </div>

      <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
        {pdfData ? (
          <div className="w-full h-32 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative animate-in zoom-in duration-300">
            <button onClick={clearStagedFile} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors">
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
            <i className="fa-solid fa-file-pdf text-3xl text-purple-400 mb-1"></i>
            <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate max-w-[180px]">{pdfName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste messy exam text here..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 font-mono outline-none focus:ring-1 focus:ring-purple-500/30 transition-all resize-none placeholder:text-slate-800"
            />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 border border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-purple-400 hover:border-purple-500/50 text-[10px] font-bold uppercase tracking-widest transition-all">
              <i className="fa-solid fa-plus mr-2"></i>Upload PDF Instead
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={loading || (!input.trim() && !pdfData) || !isApiKeySet}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-[10px] font-black rounded-xl transition-all shadow-lg uppercase tracking-widest"
        >
          {loading ? <i className="fa-solid fa-spinner animate-spin mr-2"></i> : <i className="fa-solid fa-microchip mr-2"></i>}
          {loading ? 'Cleaning Data...' : 'Scrape Correct Answers'}
        </button>

        {error && <p className="text-[10px] text-red-400 text-center font-bold uppercase">{error}</p>}

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {results.length > 0 && (
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Results: {results.length}</span>
              <button onClick={() => setResults([])} className="text-[9px] text-slate-700 hover:text-red-400 font-bold uppercase">Clear List</button>
            </div>
          )}
          
          {results.map((q, idx) => {
            const isPushed = pushedIds.has(q.id || q.text);
            const buttonDisabled = isPushed || isStagingFull;
            
            return (
              <div key={idx} className={`p-4 bg-slate-950 border ${isPushed ? 'border-emerald-500/20 opacity-60' : 'border-slate-800'} rounded-2xl space-y-3 transition-all animate-in slide-in-from-left-2`}>
                <p className={`text-[10px] ${isPushed ? 'text-slate-500' : 'text-slate-400'} line-clamp-3 leading-relaxed`}>{q.text}</p>
                <div className="flex flex-col gap-2 border-t border-slate-900 pt-3">
                  <span className="text-[9px] font-black text-emerald-500 uppercase px-2 py-0.5 bg-emerald-500/10 rounded w-fit self-start">Answer: {q.correctAnswer}</span>
                  <button
                    disabled={buttonDisabled}
                    onClick={() => handlePushClick(q)}
                    className={`w-full py-2 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all ${
                      isPushed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                      isStagingFull ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50' :
                      'bg-blue-500/5 text-blue-400 hover:bg-blue-400 hover:text-white'
                    }`}
                  >
                    {isPushed ? 'PUSHED SUCCESS' : isStagingFull ? 'STAGING FULL (6 MAX)' : 'PUSH TO ENGINE'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnswerExtractor;
