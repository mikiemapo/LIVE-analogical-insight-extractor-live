
import React, { useState, useEffect } from 'react';
import { fetchVault, VaultItem } from '../firebase';

const VaultView: React.FC = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await fetchVault();
      setItems(data);
      setLoading(false);
    };
    load();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.foundationalRule.toLowerCase().includes(search.toLowerCase()) ||
      item.domain.toLowerCase().includes(search.toLowerCase());
    
    const itemDate = new Date(item.masteredAt).getTime();
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    const matchesStartDate = start ? itemDate >= start : true;
    const matchesEndDate = end ? itemDate <= end : true;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Rule copied to clipboard!");
  };

  const clearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Accessing Master Principle Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <i className="fa-solid fa-vault text-blue-500"></i>
            PRINCIPLE ARCHIVE
          </h2>
          <button 
            onClick={clearFilters}
            className="text-xs font-bold text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-900/50 p-4 border border-slate-800 rounded-2xl">
          <div className="lg:col-span-2 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input 
              type="text"
              placeholder="Search domain or rule text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-slate-950 px-1 text-[10px] font-bold text-slate-500 uppercase">From</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-slate-950 px-1 text-[10px] font-bold text-slate-500 uppercase">To</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <i className="fa-solid fa-filter-circle-xmark text-slate-700 text-5xl"></i>
          <p className="text-slate-400 italic">No principles found matching these filters. Try broadening your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div key={item.hash} className="group bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all flex flex-col justify-between shadow-sm hover:shadow-blue-900/10">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded">
                    {item.domain}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                    <i className="fa-regular fa-calendar text-[9px]"></i>
                    {new Date(item.masteredAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-slate-200 font-bold leading-relaxed text-lg">
                  {item.foundationalRule}
                </h3>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-end">
                <button 
                  onClick={() => copyToClipboard(item.foundationalRule)}
                  className="text-[10px] font-black text-slate-500 hover:text-blue-400 flex items-center gap-2 transition-colors tracking-tighter uppercase"
                >
                  <i className="fa-solid fa-copy"></i>
                  COPY PRINCIPLE RULE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultView;
