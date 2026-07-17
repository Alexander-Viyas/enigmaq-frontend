import React, { useState } from 'react';
import { ChevronLeft, Share, CalendarDays, Maximize2, MoreHorizontal, Settings, Upload, Image, Type, History, CheckSquare, X, FileText } from 'lucide-react';
import ShareTradeModal from './ShareTradeModal';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const dateObj = new Date(year, monthIdx, day);
    const dayStr = String(day).padStart(2, '0');
    const monthStr = dateObj.toLocaleDateString('en-US', { month: 'long' });
    return `${dayStr} ${monthStr}, ${year}${timeStr ? `, ${timeStr}` : ''}`;
  }
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return '-';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const year = dateObj.getFullYear();
  return `${day} ${month}, ${year}${timeStr ? `, ${timeStr}` : ''}`;
};

const calculateHoldtime = (entryDate, entryTime, exitDate, exitTime) => {
  if (!entryDate || !exitDate) return '-';
  const start = new Date(`${entryDate}T${entryTime || '00:00'}`);
  const end = new Date(`${exitDate}T${exitTime || '00:00'}`);
  const diffMs = end - start;
  if (isNaN(diffMs) || diffMs < 0) return '00:00:00';
  
  const totalSecs = Math.floor(diffMs / 1000);
  const secs = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const mins = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  
  const pad = (num) => String(num).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
};

export default function JournaledTradeModal({ trade, onClose, onUpdate }) {
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  if (!trade) return null;

  const activeBlocks = trade.activeBlocks || [
    { id: 'checklist', type: 'checklist', title: 'Trade Checklist' },
    { id: 'history', type: 'history', title: 'Execution History' },
    { id: 'files', type: 'files', title: 'Files and Media' }
  ];

  const removeBlock = (id) => {
    const updated = activeBlocks.filter(b => b.id !== id);
    if (onUpdate) onUpdate({ ...trade, activeBlocks: updated });
  };

  const addBlock = (type) => {
    let updated;
    if (type === 'text') {
      updated = [...activeBlocks, { id: 'text-' + Date.now(), type: 'text', title: 'Text Note' }];
    } else {
      if (activeBlocks.some(b => b.type === type)) return;
      const titles = {
        checklist: 'Trade Checklist',
        history: 'Execution History',
        files: 'Files and Media'
      };
      updated = [...activeBlocks, { id: type, type, title: titles[type] }];
    }
    if (onUpdate) onUpdate({ ...trade, activeBlocks: updated });
    setIsAddBlockOpen(false);
  };

  const addChecklistItem = (e) => {
    if (e.key === 'Enter' && newChecklistItem.trim()) {
      const updated = [...(trade.checklist || []), { text: newChecklistItem.trim(), checked: false }];
      if (onUpdate) onUpdate({ ...trade, checklist: updated });
      setNewChecklistItem('');
    }
  };

  const toggleChecklistItem = (idx) => {
    const updated = (trade.checklist || []).map((item, i) => i === idx ? { ...item, checked: !item.checked } : item);
    if (onUpdate) onUpdate({ ...trade, checklist: updated });
  };

  const checklist = trade.checklist || [];

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-gray-200 overflow-y-auto font-sans flex flex-col">
      {/* Top Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#121212]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-md hover:bg-white/10 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">★ {trade.symbol}</span>
            <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-semibold rounded flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span> {trade.side || 'Short'}</span>
            <span className="px-2 py-1 bg-white/5 text-gray-300 text-xs font-semibold rounded">2RR</span>
            <span className="text-gray-400 text-xs ml-2">ICT_Alex</span>
          </div>
          <div className="flex items-center gap-1 ml-4 px-3 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-semibold">
            <span className="w-2 h-2 rounded-full border-2 border-blue-400 inline-block"></span> Complete trade
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-md">
            <span className="text-xs text-gray-400">Template</span>
            <span className="text-xs font-bold text-gray-200">Ma...</span>
            <ChevronLeft size={14} className="rotate-[-90deg] text-gray-500" />
          </div>
          <button onClick={() => setIsShareOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors">
            <Share size={14} /> Share trade
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="px-6 py-2 mt-4 mx-6 bg-[#1a1a1a] rounded-lg border border-white/5 flex items-center gap-2 text-xs text-gray-400 font-semibold">
        <span className="text-orange-500">⚠</span> Data unavailable
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 pb-24">
        
        {/* Trade Details Block */}
        <div className="bg-[#121212] border border-white/5 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white font-bold text-base">Trade details</h2>
            <button onClick={() => alert('Add column clicked')} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-300 transition-colors">
              + Add new column
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Net PnL</span>
                <span className="font-bold text-gray-200">{trade.pnl ? formatCurrency(trade.pnl) : '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Commission</span>
                <span className="font-bold text-red-500">-${trade.fees || '0.2'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Funding</span>
                <span className="font-bold text-gray-200">$2</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Holdtime</span>
                <span className="font-bold text-gray-200">{calculateHoldtime(trade.entryDate, trade.entryTime, trade.exitDate, trade.exitTime)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Side</span>
                <span className="font-bold text-red-500 flex items-center gap-1">↘ {trade.side || 'Short'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Size</span>
                <span className="font-bold text-gray-200">{trade.quantity || '1'} {trade.symbol || 'units'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Leverage</span>
                <span className="font-bold text-gray-200">1000x</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Entry</span>
                <span className="font-bold text-gray-200">{trade.entryPrice}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Exit</span>
                <span className="font-bold text-gray-200">{trade.exitPrice}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Take Profit</span>
                <span className="font-bold text-gray-200">{trade.profitTarget || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Stop Loss</span>
                <span className="font-bold text-gray-200">{trade.stopLoss || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Session</span>
                <span className="font-bold text-gray-200">-</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Weekday</span>
                <span className="font-bold text-gray-200">{trade.entryDate ? new Date(trade.entryDate).toLocaleDateString('en-US', { weekday: 'long' }) : '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Open date</span>
                <span className="font-bold text-gray-200">{formatDateTime(trade.entryDate, trade.entryTime)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Close date</span>
                <span className="font-bold text-gray-200">{formatDateTime(trade.exitDate, trade.exitTime)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeBlocks.map(block => {
            if (block.type === 'checklist') {
              const completedCount = checklist.filter(i => i.checked).length;
              return (
                <div key={block.id} className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">⋮⋮</span> {block.title}</h3>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => removeBlock(block.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Remove Block">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-1">
                        <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(idx)} className="w-4 h-4 rounded border-gray-700 bg-transparent accent-blue-600 cursor-pointer" />
                        <span className={`text-xs ${item.checked ? 'line-through text-gray-500' : 'text-gray-300'}`}>{item.text}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 py-1">
                      <input type="checkbox" disabled className="w-4 h-4 rounded border-gray-700 bg-transparent" />
                      <input 
                        type="text" 
                        value={newChecklistItem} 
                        onChange={e => setNewChecklistItem(e.target.value)} 
                        onKeyDown={addChecklistItem}
                        placeholder="New checklist item..." 
                        className="bg-transparent border-b border-white/10 flex-1 outline-none text-sm text-gray-300 placeholder-gray-600 pb-1" 
                      />
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded-full border border-gray-600"></div>
                    {completedCount} of {checklist.length} completed
                  </div>
                </div>
              );
            }
            if (block.type === 'history') {
              return (
                <div key={block.id} className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">⋮⋮</span> {block.title}</h3>
                    <button onClick={() => removeBlock(block.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Remove Block">
                      <X size={14} />
                    </button>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="text-gray-500 border-b border-white/5">
                      <tr>
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Price</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="py-3 text-gray-300">{trade.entryTime || '00:00:00'}</td>
                        <td className="py-3 text-gray-250 font-bold">${trade.entryPrice}</td>
                        <td className="py-3 text-gray-400">Market</td>
                        <td className="py-3 text-gray-200 text-right">{trade.quantity} {trade.symbol}</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-gray-300">{trade.exitTime || '00:00:00'}</td>
                        <td className="py-3 text-gray-250 font-bold">${trade.exitPrice}</td>
                        <td className="py-3 text-gray-400">Market</td>
                        <td className="py-3 text-gray-200 text-right">{trade.quantity} {trade.symbol}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }
            if (block.type === 'files') {
              const currentAttachments = trade.attachments || [];
              return (
                <div key={block.id} className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">≡</span> {block.title}</h3>
                    <button onClick={() => removeBlock(block.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Remove Block">
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* List of attachments */}
                    {currentAttachments.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 mb-2 max-h-[140px]">
                        {currentAttachments.map(att => (
                          <div key={att.id} className="relative group rounded-lg overflow-hidden border border-white/10 h-16 bg-white/5 flex items-center justify-center">
                            {att.type?.startsWith('image/') ? (
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-6 h-6 text-gray-400" />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = currentAttachments.filter(a => a.id !== att.id);
                                if (onUpdate) onUpdate({ ...trade, attachments: updated });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 mb-2">
                        <Upload size={20} className="mb-1 text-gray-600" />
                        <span className="text-[10px]">No files uploaded</span>
                      </div>
                    )}

                    <div className="mt-auto">
                      <label className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-gray-300 transition-colors mb-2 cursor-pointer flex items-center justify-center gap-1.5 border border-white/5">
                        <Upload size={12} /> Choose file
                        <input 
                          type="file" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            const updated = [...currentAttachments];
                            let processed = 0;
                            files.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updated.push({
                                  id: Math.random().toString(36).substring(2, 9),
                                  name: file.name,
                                  type: file.type,
                                  url: reader.result
                                });
                                processed++;
                                if (processed === files.length) {
                                  if (onUpdate) onUpdate({ ...trade, attachments: updated });
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }} 
                          className="hidden" 
                          accept="image/*,video/*" 
                          multiple 
                        />
                      </label>
                      <p className="text-[9px] text-gray-500 text-center">PNG, JPG up to 14MB</p>
                    </div>
                  </div>
                </div>
              );
            }
            if (block.type === 'text') {
              const textVal = trade.customNotes?.[block.id] || '';
              return (
                <div key={block.id} className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">✍</span> {block.title}</h3>
                    <button onClick={() => removeBlock(block.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Remove Block">
                      <X size={14} />
                    </button>
                  </div>
                  <textarea 
                    placeholder="Type your notes here..." 
                    value={textVal}
                    onChange={(e) => {
                      const updated = { ...(trade.customNotes || {}), [block.id]: e.target.value };
                      if (onUpdate) onUpdate({ ...trade, customNotes: updated });
                    }}
                    className="w-full flex-1 bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-gray-255 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              );
            }
            return null;
          })}

          {/* Add New Block Button */}
          <div className="relative h-[280px]">
            <div onClick={() => setIsAddBlockOpen(!isAddBlockOpen)} className="bg-transparent border border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center h-full hover:bg-white/5 transition-colors cursor-pointer text-gray-500 group">
               <span className="text-2xl mb-2 group-hover:text-gray-300 transition-colors">+</span>
               <h3 className="text-sm font-bold group-hover:text-gray-300 transition-colors">Add new block</h3>
               <p className="text-[10px] text-center mt-2 px-4 leading-relaxed group-hover:text-gray-400">You can choose one of the ready-made blocks to add<br/>and customize them for yourself.</p>
            </div>

            {isAddBlockOpen && (
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                <button onClick={() => addBlock('files')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors text-left bg-transparent">
                  <Image size={16} className="text-gray-400" /> Files and Media
                </button>
                <button onClick={() => addBlock('text')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors text-left bg-transparent">
                  <Type size={16} className="text-gray-400" /> Text
                </button>
                <button onClick={() => addBlock('history')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors text-left bg-transparent">
                  <History size={16} className="text-gray-400" /> Execution History
                </button>
                <button onClick={() => addBlock('checklist')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors text-left bg-transparent">
                  <CheckSquare size={16} className="text-gray-400" /> Trade Checklist
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
      {isShareOpen && <ShareTradeModal trade={trade} onClose={() => setIsShareOpen(false)} />}
    </div>
  );
}
