
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center space-y-4">
      <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30 mb-2">
        <i className="fa-solid fa-brain-circuit text-blue-400 text-3xl"></i>
      </div>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white italic">
        ANALOGICAL INSIGHT <span className="text-blue-500">EXTRACTOR</span>
      </h1>
      <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
        Transform correctly answered <span className="text-blue-400 font-semibold">AZ-104</span> questions into high-fidelity mental models optimized for NotebookLM slide generation.
      </p>
    </header>
  );
};

export default Header;
