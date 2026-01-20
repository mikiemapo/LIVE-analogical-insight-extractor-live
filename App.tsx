
import React, { useState, useCallback, useEffect } from 'react';
import { AZ104Question, ProcessingStatus, ExtractionResult, ExtractedQuestion } from './types';
import { processInsights } from './geminiService';
import { getQuestionHash, checkDuplicate, saveToVault } from './firebase';
import Header from './components/Header';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import VaultView from './components/VaultView';
import SettingsDrawer from './components/SettingsDrawer';
import AnswerExtractor from './components/AnswerExtractor';

const STORAGE_KEY_INPUT = 'analogical_insight_input';

const App: React.FC = () => {
  const [view, setView] = useState<'generator' | 'vault'>('generator');
  const [inputText, setInputText] = useState<string>(() => localStorage.getItem(STORAGE_KEY_INPUT) || '');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [pendingBatch, setPendingBatch] = useState<any>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Robust API key check
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(() => !!process.env.API_KEY);

  // Derived state for staging limit using pattern matching for "Question: " to be precise
  const stagedCount = (inputText.match(/Question: /g) || []).length;
  const isStagingFull = stagedCount >= 6;

  useEffect(() => {
    setIsEmbedded(window.self !== window.top);
  }, []);

  useEffect(() => {
    const check = setInterval(() => {
      const currentKey = !!process.env.API_KEY;
      setIsApiKeySet(currentKey);
    }, 2000);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INPUT, inputText);
  }, [inputText]);

  const executeProcessing = async (batch: string[], hashes: string[]) => {
    if (batch.length === 0) {
      setError("No new questions to process.");
      setStatus(ProcessingStatus.IDLE);
      setPendingBatch(null);
      return;
    }

    if (!isApiKeySet) {
      setError("AI Logic Engine is offline. Please configure your API key.");
      setStatus(ProcessingStatus.ERROR);
      return;
    }

    setStatus(ProcessingStatus.LOADING);
    setError(null);
    setPendingBatch(null);

    try {
      const formattedQuestions: AZ104Question[] = batch.map(rq => ({
        text: rq,
        correctAnswer: 'Verified', 
        explanation: 'Verified'
      }));

      const extraction = await processInsights(formattedQuestions);
      
      // Save to vault if Firebase is configured
      try {
        for (let i = 0; i < (extraction.blocks || []).length; i++) {
          if (hashes[i]) {
            await saveToVault(hashes[i], extraction.domain, extraction.blocks[i].foundationalRule);
          }
        }
      } catch (vaultErr) {
        console.warn("Vault sync failed. Check Firebase config in Integration center.", vaultErr);
      }

      setResult(extraction);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || 'Processing failed. Try a smaller batch.');
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleInitialScan = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setStatus(ProcessingStatus.LOADING);
    setError(null);
    
    try {
      // Split by double newline or the Question: pattern
      const rawQuestions = inputText.trim().split(/\n\s*\n/).filter(c => c.includes("Question:")).slice(0, 6);
      
      if (rawQuestions.length === 0) {
        throw new Error("No valid questions detected. Ensure you push questions from the Scraper first.");
      }

      const hashes = await Promise.all(rawQuestions.map(rq => getQuestionHash(rq)));
      
      // Attempt to check duplicates if Firebase is available
      let duplicates: boolean[] = new Array(hashes.length).fill(false);
      try {
        duplicates = await Promise.all(hashes.map(h => checkDuplicate(h)));
      } catch (e) {
        console.log("Skipping duplicate check (Firebase not configured)");
      }
      
      const duplicateIndices = duplicates.map((d, i) => d ? i : -1).filter(i => i !== -1);

      if (duplicateIndices.length > 0) {
        setPendingBatch({ questions: rawQuestions, hashes, duplicateIndices });
        setStatus(ProcessingStatus.IDLE);
      } else {
        await executeProcessing(rawQuestions, hashes);
      }
    } catch (err: any) {
      setError(err.message);
      setStatus(ProcessingStatus.ERROR);
    }
  }, [inputText, isApiKeySet]);

  const handlePushToEngine = (q: ExtractedQuestion) => {
    // RE-CALCULATE limit inside function to be absolutely sure
    const currentCount = (inputText.match(/Question: /g) || []).length;
    if (currentCount >= 6) {
      alert("Generator limit reached! (Max 6 questions). Clear the staging area or process the current batch.");
      return;
    }
    const formatted = `Question: ${q.text}\nCorrect Answer: ${q.correctAnswer}\nExplanation: ${q.explanation}`;
    setInputText(prev => prev ? `${prev}\n\n${formatted}` : formatted);
  };

  const handleReset = () => {
    setInputText('');
    setResult(null);
    setStatus(ProcessingStatus.IDLE);
    setError(null);
    setPendingBatch(null);
    localStorage.removeItem(STORAGE_KEY_INPUT);
  };

  const handleCopyInput = () => {
    if (inputText.trim()) {
      navigator.clipboard.writeText(inputText);
    }
  };

  return (
    <div className={`mx-auto ${isEmbedded ? 'p-2' : 'max-w-7xl px-4 py-8 md:py-12'} flex flex-col min-h-screen font-sans bg-slate-950 text-slate-50`}>
      {!isEmbedded && <Header />}
      
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 shadow-inner">
          <button 
            type="button"
            onClick={() => setView('generator')} 
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${view === 'generator' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            GENERATOR
          </button>
          <button 
            type="button"
            onClick={() => setView('vault')} 
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${view === 'vault' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            VAULT
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isApiKeySet ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></span>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              {isApiKeySet ? 'Logic Engine Active' : 'Logic Engine Offline'}
            </span>
          </div>
          <button type="button" onClick={() => setShowSettings(true)} className="text-slate-500 hover:text-blue-400 text-sm flex items-center gap-2 group transition-colors">
            <i className="fa-solid fa-gear group-hover:rotate-90 transition-transform duration-500"></i>
            <span className="font-bold tracking-tighter uppercase">Integration Center</span>
          </button>
        </div>
      </div>

      <main className="flex-1 mt-8">
        {view === 'vault' ? <VaultView /> : (
          result ? <OutputSection result={result} onReset={handleReset} /> : 
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 h-full">
              <AnswerExtractor 
                onPush={handlePushToEngine} 
                isApiKeySet={isApiKeySet} 
                isStagingFull={isStagingFull} 
              />
            </div>

            <div className="lg:col-span-8">
              <InputSection 
                value={inputText} 
                onChange={setInputText} 
                onProcess={handleInitialScan} 
                onClear={handleReset}
                onCopy={handleCopyInput}
                loading={status === ProcessingStatus.LOADING}
                error={error}
                duplicateCount={pendingBatch?.duplicateIndices.length || 0}
                stagedCount={stagedCount}
                onSkipDuplicates={() => executeProcessing(
                  pendingBatch.questions.filter((_: any, i: any) => !pendingBatch.duplicateIndices.includes(i)), 
                  pendingBatch.hashes.filter((_: any, i: any) => !pendingBatch.duplicateIndices.includes(i))
                )}
                onProcessAll={() => executeProcessing(pendingBatch.questions, pendingBatch.hashes)}
              />
            </div>
          </div>
        )}
      </main>

      <SettingsDrawer 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        isApiKeySet={isApiKeySet}
      />
      
      {!isEmbedded && (
        <footer className="mt-12 py-8 border-t border-slate-900 text-center text-slate-700">
          <p className="text-[10px] font-black tracking-widest uppercase opacity-50">Microsoft Learn Powered • Analogical Mastery Framework</p>
        </footer>
      )}
    </div>
  );
};

export default App;
