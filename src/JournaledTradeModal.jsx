import React, { useState } from 'react';
import { ChevronLeft, Share, CalendarDays, Maximize2, MoreHorizontal, Settings, Upload, Image, Type, History, CheckSquare } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

export default function JournaledTradeModal({ trade, onClose }) {
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);

  if (!trade) return null;
  if (!trade) return null;

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
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors">
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
                <span className="font-bold text-gray-200">00:00:00:00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Side</span>
                <span className="font-bold text-red-500 flex items-center gap-1">↘ {trade.side || 'Short'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Size</span>
                <span className="font-bold text-gray-200">{trade.quantity || '1'} BTC</span>
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
                <span className="font-bold text-gray-200">2</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Stop Loss</span>
                <span className="font-bold text-gray-200">1.25</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Session</span>
                <span className="font-bold text-gray-200">-</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Weekday</span>
                <span className="font-bold text-gray-200">Saturday</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Open date</span>
                <span className="font-bold text-gray-200">04 July, 2026, 00:00:00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Close date</span>
                <span className="font-bold text-gray-200">04 July, 2026, 00:00:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trade Checklist */}
          <div className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">⋮⋮</span> Trade Checklist</h3>
              <MoreHorizontal size={16} className="text-gray-500" />
            </div>
            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-transparent accent-blue-600" />
              <input type="text" placeholder="New checklist item..." className="bg-transparent border-b border-white/10 flex-1 outline-none text-sm text-gray-300 placeholder-gray-600 pb-1" />
            </div>
            <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full border border-gray-600"></div>
              0 of 0 completed
            </div>
          </div>

          {/* Execution History */}
          <div className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">⋮⋮</span> Execution History</h3>
              <MoreHorizontal size={16} className="text-gray-500" />
            </div>
            <table className="w-full text-xs text-left">
              <thead className="text-gray-500 border-b border-white/5">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 text-gray-300">00:00:00</td>
                  <td className="py-3 text-gray-200 font-bold">${trade.entryPrice}</td>
                  <td className="py-3 text-gray-400">Market</td>
                  <td className="py-3 text-gray-200 text-right">{trade.quantity} BTC</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">00:00:00</td>
                  <td className="py-3 text-gray-200 font-bold">${trade.exitPrice}</td>
                  <td className="py-3 text-gray-400">Market</td>
                  <td className="py-3 text-gray-200 text-right">{trade.quantity} BTC</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Files and Media */}
          <div className="bg-[#121212] border border-white/5 rounded-xl p-5 flex flex-col h-[280px]">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="text-gray-500">≡</span> Files and Media</h3>
              <MoreHorizontal size={16} className="text-gray-500" />
            </div>
            <div className="flex gap-4 border-b border-white/5 mb-4">
              <button className="text-blue-500 text-xs font-bold border-b-2 border-blue-500 pb-2">Upload</button>
              <button className="text-gray-500 text-xs font-bold pb-2">Embed link</button>
            </div>
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold text-gray-300 transition-colors mb-2">
              Choose file
            </button>
            <p className="text-[10px] text-gray-600">The maximum size is 14 MB</p>
          </div>

          {/* Add New Block Button */}
          <div className="relative h-[280px]">
            <div onClick={() => setIsAddBlockOpen(!isAddBlockOpen)} className="bg-transparent border border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center h-full hover:bg-white/5 transition-colors cursor-pointer text-gray-500 group">
               <span className="text-2xl mb-2 group-hover:text-gray-300 transition-colors">+</span>
               <h3 className="text-sm font-bold group-hover:text-gray-300 transition-colors">Add new block</h3>
               <p className="text-[10px] text-center mt-2 px-4 leading-relaxed group-hover:text-gray-400">You can choose one of the ready-made blocks to add<br/>and customize them for yourself.</p>
            </div>

            {isAddBlockOpen && (
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                <button onClick={() => setIsAddBlockOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors">
                  <Image size={16} className="text-gray-400" /> Files and Media
                </button>
                <button onClick={() => setIsAddBlockOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors">
                  <Type size={16} className="text-gray-400" /> Text
                </button>
                <button onClick={() => setIsAddBlockOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors">
                  <History size={16} className="text-gray-400" /> Execution History
                </button>
                <button onClick={() => setIsAddBlockOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg text-sm font-semibold text-gray-300 transition-colors">
                  <CheckSquare size={16} className="text-gray-400" /> Trade Checklist
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
