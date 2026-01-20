import React, { useState, useEffect } from 'react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isApiKeySet: boolean;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, isApiKeySet }) => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('vault_firebase_config');
    return saved ? JSON.parse(saved) : { projectId: '', apiKey: '', authDomain: '', appId: '' };
  });

  const save = () => {
    localStorage.setItem('vault_firebase_config', JSON.stringify(config));
    alert("Configuration saved. Refreshing application state...");
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 p-8 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fa-solid fa-plug text-blue-500"></i>
            INTEGRATION CENTER
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="space-y-8">
          {/* Status Section */}
          <section className="space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Engine & Vault Health</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border ${isApiKeySet ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
                <p className="text-[10px] font-bold uppercase mb-1">Logic Engine</p>
                <p className="text-sm font-black flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isApiKeySet ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {isApiKeySet ? 'ACTIVE' : 'OFFLINE'}
                </p>
              </div>
              <div className={`p-4 rounded-xl border ${config.projectId ? 'bg-blue-500/5 border-blue-500/20 text-blue-500' : 'bg-slate-800/20 border-slate-800 text-slate-600'}`}>
                <p className="text-[10px] font-bold uppercase mb-1">Principle Vault</p>
                <p className="text-sm font-black flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.projectId ? 'bg-blue-500' : 'bg-slate-700'}`}></span>
                  {config.projectId ? 'CONNECTED' : 'STANDALONE'}
                </p>
              </div>
            </div>
          </section>

          {/* Firebase Settings */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Firebase Vault Config</h4>
              <i className="fa-solid fa-database text-slate-700"></i>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">Connect your own Firestore instance to sync your mastered principles across multiple browsers and study guides.</p>
            <div className="space-y-3">
              {['projectId', 'apiKey', 'authDomain', 'appId'].map(key => (
                <div key={key}>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1 ml-1">{key}</label>
                  <input
                    type="text"
                    value={config[key]}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    placeholder={`Enter ${key}...`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Integration Snippets */}
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Guide Event Bridge</h4>
            <p className="text-xs text-slate-400">Add this listener to your study guide to automatically capture extracted mastery insights as they are generated.</p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <p className="text-[10px] text-blue-400 mb-2">// study-guide.js</p>
              <code className="text-xs text-slate-500 block leading-tight">
                window.addEventListener('message', (e) =&gt;  &#123; <br />
                &nbsp;&nbsp;if (e.data.type === 'new-insight-generated') &#123; <br />
                &nbsp;&nbsp;&nbsp;&nbsp;const insight = e.data.data; <br />
                &nbsp;&nbsp;&nbsp;&nbsp;console.log("Mastery Captured:", insight); <br />
                &nbsp;&nbsp;&#125; <br />
                &#125;);
              </code>
            </div>
          </section>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={save}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
            >
              UPDATE CONFIGURATION
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl transition-colors"
            >
              CLOSE SETTINGS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;