
import React, { useState } from 'react';
import { ExtractionResult } from '../types';

interface OutputSectionProps {
  result: ExtractionResult | null;
  onReset: () => void;
}

const OutputSection: React.FC<OutputSectionProps> = ({ result, onReset }) => {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = () => {
    const text = document.getElementById('notebooklm-output')?.innerText;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Banner */}
      {copied && (
        <div className="w-full bg-emerald-500 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 animate-in zoom-in duration-300">
          <i className="fa-solid fa-circle-check text-xl"></i>
          <span>Content copied to clipboard successfully! Ready to paste into NotebookLM.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-col gap-1">
          <span className="text-blue-400 font-bold tracking-widest text-[10px] uppercase">Validated Domain</span>
          <span className="text-white font-semibold text-lg">{result.domain}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <i className={`fa-solid ${copied ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
            {copied ? 'COPIED!' : 'COPY FOR NOTEBOOKLM'}
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            RESET
          </button>
        </div>
      </div>

      <div id="notebooklm-output" className="bg-slate-900 border border-slate-700 rounded-2xl p-8 space-y-12">
        <div className="pb-4 border-b border-slate-800">
          <h2 className="text-2xl font-black text-blue-500">AZ-104 MASTER-PRINCIPLE SET: {result.domain}</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-tighter italic">Validated against Microsoft Learn • Optimized for NotebookLM</p>
        </div>

        {result.blocks.map((block, idx) => (
          <div key={idx} className="space-y-6 border-l-4 border-blue-600/50 pl-6 py-2">
            <div className="space-y-1">
              <span className="text-blue-500 font-black text-xs uppercase tracking-widest">Foundational Block 0{idx + 1}</span>
              <h3 className="text-xl font-bold text-slate-100">{block.foundationalRule}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-4">
                <section>
                  <h4 className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mb-1">Why It Works (Documentation-Backed)</h4>
                  <p className="text-slate-300 leading-relaxed">{block.whyItWorks}</p>
                </section>
                <section>
                  <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-1">Analogy (Non-Technical)</h4>
                  <p className="text-slate-400 italic">"{block.analogy}"</p>
                </section>
                <section>
                  <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-1">Analogous Foundational Concept</h4>
                  <p className="text-slate-300">{block.analogousFoundationalConcept}</p>
                </section>
              </div>
              
              <div className="space-y-4">
                <section className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg">
                  <h4 className="text-red-400 font-bold uppercase text-[10px] tracking-widest mb-1">Common Confusion & Why It's Wrong</h4>
                  <p className="text-slate-300">{block.commonConfusion}</p>
                </section>
                <section className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="text-blue-300 font-bold uppercase text-[10px] tracking-widest mb-1">Exam Elimination Cue</h4>
                  <p className="text-slate-300">{block.examEliminationCue}</p>
                </section>
                <section className="pt-2">
                  <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest mb-1">One-Line Memory Hook</h4>
                  <p className="text-lg font-bold text-white tracking-tight italic">"{block.memoryHook}"</p>
                </section>
              </div>
            </div>
          </div>
        ))}

        {result.sources && result.sources.length > 0 && (
          <div className="pt-8 border-t border-slate-800">
            <h4 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-3">Grounding Documentation & Sources</h4>
            <div className="flex flex-wrap gap-2">
              {result.sources.map((source, sIdx) => (
                <a 
                  key={sIdx}
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs rounded-full border border-slate-700 transition-colors"
                >
                  <i className="fa-solid fa-link text-[10px]"></i>
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
        <i className="fa-solid fa-file-export text-blue-400 text-2xl"></i>
        <div>
          <h4 className="text-white font-bold">Ready for NotebookLM</h4>
          <p className="text-slate-400 text-sm">This set is grounded in official documentation and ready for expansion into a slide deck or podcast.</p>
        </div>
      </div>
    </div>
  );
};

export default OutputSection;
