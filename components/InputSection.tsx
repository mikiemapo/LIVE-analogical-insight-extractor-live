
import React from 'react';

interface InputSectionProps {
  value: string;
  onChange: (val: string) => void;
  onProcess: () => void;
  onClear: () => void;
  onCopy: () => void;
  onSkipDuplicates?: () => void;
  onProcessAll?: () => void;
  loading: boolean;
  error: string | null;
  duplicateCount: number;
  stagedCount: number;
}

const InputSection: React.FC<InputSectionProps> = ({ 
  value, 
  onChange, 
  onProcess, 
  onClear,
  onCopy,
  onSkipDuplicates, 
  onProcessAll, 
  loading, 
  error, 
  duplicateCount,
  stagedCount
}) => {
  const hasDuplicates = duplicateCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
           <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${stagedCount >= 6 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
            <i className="fa-solid fa-list-check mr-2"></i>
            Staged Items: {stagedCount} / 6
           </span>
        </div>
        <div className="flex gap-4">
           <button onClick={onCopy} className="text-[10px] font-bold text-slate-600 hover:text-emerald-400 uppercase tracking-widest transition-colors flex items-center gap-2">
             <i className="fa-solid fa-copy"></i> Copy Staging
           </button>
           <button onClick={onClear} className="text-[10px] font-bold text-slate-600 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-2">
             <i className="fa-solid fa-trash-can"></i> Clear All
           </button>
        </div>
      </div>

      <div className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r ${stagedCount >= 6 ? 'from-orange-600 to-red-600' : 'from-blue-600 to-indigo-600'} rounded-3xl blur opacity-10 group-focus-within:opacity-20 transition duration-500`}></div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Extracted insights from the scraper will appear here. You can push up to 6 questions at a time."
          className="relative w-full h-80 bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none shadow-2xl backdrop-blur-sm"
        />
      </div>

      {hasDuplicates && !loading && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl text-amber-400 space-y-4 animate-in fade-in zoom-in shadow-xl">
          <div className="flex items-center gap-4">
            <i className="fa-solid fa-clone text-2xl"></i>
            <div>
              <p className="font-black text-sm uppercase">Duplicate Mastery Detected</p>
              <p className="text-xs text-amber-400/60 mt-1">{duplicateCount} items from this batch are already stored in your Principle Vault.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onSkipDuplicates} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-[10px] transition-all uppercase tracking-widest">Skip Duplicates</button>
            <button onClick={onProcessAll} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-xl text-[10px] transition-all uppercase tracking-widest">Process All Anyway</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 flex items-center gap-3 animate-in shake duration-500">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span className="text-[10px] font-bold uppercase tracking-tight">{error}</span>
        </div>
      )}

      {!hasDuplicates && (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onProcess}
            disabled={loading || stagedCount === 0}
            className="w-full sm:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-3xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-brain animate-pulse"></i>
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt-lightning"></i>
                <span>Analyze Batch</span>
              </>
            )}
          </button>
          <div className="flex flex-col text-left">
             <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <i className="fa-solid fa-shield-halved mr-2 text-blue-500"></i>
              Verified Staging Area
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputSection;
