import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, List, Calendar as CalendarIcon, Plus, 
  Settings, X, TrendingUp, Bell, User, CalendarDays,
  ChevronLeft, ChevronRight, ChevronDown, BarChart3, Target, Activity, 
  BookOpen, Wind, Bold, Italic, Underline, Strikethrough,
  Download, FileText, Folder, Play, Pause, RotateCcw, CheckCircle2,
  Moon, Sun
} from 'lucide-react';
import JournaledTradeModal from './JournaledTradeModal';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, RadialLinearScale, ArcElement, 
  Title, Tooltip, Legend, Filler,
  LineController, BarController, RadarController, DoughnutController
} from 'chart.js';
import { Bar, Radar, Doughnut, Chart, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, 
  RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler,
  LineController, BarController, RadarController, DoughnutController
);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const EMPTY_APP_STATE = {
  trades: [],
  accounts: [{ id: '1', name: 'Default Account' }],
  selectedAccountId: '1',
  strategies: [],
  folders: ['Daily Journal', 'Trade Notes', 'Strategy Notes', 'Other'],
  notes: []
};

const generateId = () => Math.random().toString(36).substring(2, 9);
const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
const formatPercent = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val || 0);
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const getInputDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

const calcPnL = (side, entry, exit, qty, fees = 0) => {
  if (!entry || !exit || !qty) return 0;
  const gross = side === 'Long' ? (exit - entry) * qty : (entry - exit) * qty;
  return gross - (fees || 0);
};

const stDev = (arr) => {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

const calculateTradeStats = (trades) => {
  let gp = 0, gl = 0, w = 0, l = 0, be = 0, rulesFollowedCount = 0;
  const days = {};
  
  trades.forEach(t => {
    if (t.pnl > 0) { gp += t.pnl; w++; }
    else if (t.pnl < 0) { gl += Math.abs(t.pnl); l++; }
    else { be++; }
    
    if (t.rulesFollowed) rulesFollowedCount++;
    
    const d = t.exitDate.split('T')[0];
    if (!days[d]) days[d] = 0;
    days[d] += t.pnl;
  });

  const net = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = trades.length ? w / trades.length : 0;
  const lossRate = trades.length ? l / trades.length : 0;
  const pf = gl === 0 ? (gp > 0 ? Infinity : 0) : gp / gl;
  const avgW = w ? gp / w : 0;
  const avgL = l ? gl / l : 0;
  const ev = (winRate * avgW) - (lossRate * avgL);
  const winLossRatio = avgL === 0 ? (avgW > 0 ? Infinity : 0) : avgW / avgL;

  const sortedDays = Object.keys(days).sort().reverse();
  let streak = 0;
  for (const d of sortedDays) { if (days[d] >= 0) streak++; else break; }
  const bestDay = sortedDays.reduce((best, d) => days[d] > (days[best] || -Infinity) ? d : best, sortedDays[0] || null);
  const worstDay = sortedDays.reduce((worst, d) => days[d] < (days[worst] || Infinity) ? d : worst, sortedDays[0] || null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.exitDate.startsWith(todayStr));
  const todayPnL = todayTrades.reduce((s, t) => s + t.pnl, 0);

  return {
    net, pf, winRate, lossRate, avgW, avgL, w, l, be, gp, gl, ev, winLossRatio,
    rulesPct: trades.length ? rulesFollowedCount / trades.length : 0,
    rulesFollowedCount,
    streak, bestDay, bestPnL: bestDay ? days[bestDay] : 0, worstDay, worstPnL: worstDay ? days[worstDay] : 0,
    todayPnL, todayCount: todayTrades.length,
    tradedDays: sortedDays.length,
    total: trades.length
  };
};

const useModalA11y = (isOpen, onClose, modalTitleId) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => {
        if (e.key === 'Escape' && onClose) {
          e.stopPropagation();
          onClose();
        }
      };
      document.addEventListener('keydown', handleEsc, true);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEsc, true);
      };
    }
  }, [isOpen, onClose]);
};

export default function App() {
  // Global States
  const [allTrades, setAllTrades] = useState(EMPTY_APP_STATE.trades);
  const [accounts, setAccounts] = useState(EMPTY_APP_STATE.accounts);
  const [selectedAccountId, setSelectedAccountId] = useState(EMPTY_APP_STATE.selectedAccountId);
  const trades = useMemo(() => allTrades.filter(t => !t.accountId || t.accountId === selectedAccountId), [allTrades, selectedAccountId]);
  const [strategies, setStrategies] = useState(EMPTY_APP_STATE.strategies);
  const [folders, setFolders] = useState(EMPTY_APP_STATE.folders);
  const [notes, setNotes] = useState(EMPTY_APP_STATE.notes);
  const [backendStatus, setBackendStatus] = useState('loading');
  const hasLoadedBackend = useRef(false);
  
  // UI States
  const [currentView, setCurrentView] = useState('dashboard');
  const [dashboardDate, setDashboardDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Modal States
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayTrades, setSelectedDayTrades] = useState({ date: null, trades: [] });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isStartDayOpen, setIsStartDayOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  useEffect(() => {
    const loadState = async () => {
      ['tradePath_data', 'tradePath_strategies', 'tradePath_folders', 'tradePath_notes', 'tradePath_accounts', 'tradePath_activeAccount'].forEach(key => localStorage.removeItem(key));
      try {
        const res = await fetch(`${API_BASE}/state`);
        if (!res.ok) throw new Error('Backend unavailable');
        const data = await res.json();
        setAllTrades(Array.isArray(data.trades) ? data.trades : []);
        setAccounts(Array.isArray(data.accounts) && data.accounts.length ? data.accounts : EMPTY_APP_STATE.accounts);
        setSelectedAccountId(data.selectedAccountId || EMPTY_APP_STATE.selectedAccountId);
        setStrategies(Array.isArray(data.strategies) ? data.strategies : []);
        setFolders(Array.isArray(data.folders) && data.folders.length ? data.folders : EMPTY_APP_STATE.folders);
        setNotes(Array.isArray(data.notes) ? data.notes : []);
        setBackendStatus('connected');
      } catch (err) {
        const fallback = localStorage.getItem('alpha_app_state');
        if (fallback) {
          const data = JSON.parse(fallback);
          setAllTrades(Array.isArray(data.trades) ? data.trades : []);
          setAccounts(Array.isArray(data.accounts) && data.accounts.length ? data.accounts : EMPTY_APP_STATE.accounts);
          setSelectedAccountId(data.selectedAccountId || EMPTY_APP_STATE.selectedAccountId);
          setStrategies(Array.isArray(data.strategies) ? data.strategies : []);
          setFolders(Array.isArray(data.folders) && data.folders.length ? data.folders : EMPTY_APP_STATE.folders);
          setNotes(Array.isArray(data.notes) ? data.notes : []);
        }
        setBackendStatus('offline');
      } finally {
        hasLoadedBackend.current = true;
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    if (!hasLoadedBackend.current) return;
    const appState = { trades: allTrades, strategies, folders, notes, accounts, selectedAccountId };
    localStorage.setItem('alpha_app_state', JSON.stringify(appState));
    if (backendStatus !== 'connected') return;
    fetch(`${API_BASE}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState)
    }).catch(() => setBackendStatus('offline'));
  }, [allTrades, strategies, folders, notes, accounts, selectedAccountId, backendStatus]);

  const clearAllData = () => {
    setAllTrades([]); setStrategies([]); setNotes([]);
    setIsSettingsOpen(false);
  };

  const handleSaveTrade = (tradeData) => {
    const newTrade = { ...tradeData, accountId: selectedAccountId };
    if (editingTrade) setAllTrades(allTrades.map(t => t.id === editingTrade.id ? newTrade : t));
    else setAllTrades([newTrade, ...allTrades].sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate)));
    const answers = newTrade.journalAnswers || {};
    const answeredLines = Object.entries(answers).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `- ${key}: ${value}`);
    if (answeredLines.length || newTrade.notes) {
      const title = `${newTrade.symbol || 'Trade'} journal - ${formatDate(newTrade.exitDate)}`;
      const content = [
        `Symbol: ${newTrade.symbol || '-'}`,
        `Model: ${answers.Model || '-'}`,
        `Strategy: ${(newTrade.tags || []).join(', ') || answers.Strategy || '-'}`,
        `Psychology: ${answers.Psychology || '-'}`,
        '',
        'Answers:',
        ...answeredLines,
        '',
        newTrade.notes ? `Trade notes: ${newTrade.notes}` : ''
      ].filter(Boolean).join('\n');
      const note = { id: newTrade.journalNoteId || generateId(), folder: 'Trade Notes', title, content, tradeId: newTrade.id };
      setNotes(prev => {
        const exists = prev.some(n => n.tradeId === newTrade.id);
        return exists ? prev.map(n => n.tradeId === newTrade.id ? note : n) : [note, ...prev];
      });
    }
    setIsTradeModalOpen(false);
    setEditingTrade(null);
  };

  const handleDeleteTrade = (id) => {
    setAllTrades(allTrades.filter(t => t.id !== id));
    setIsTradeModalOpen(false);
  };

  const openAddModal = () => { setEditingTrade(null); setIsTradeModalOpen(true); };
  const openEditModal = (trade) => { setEditingTrade(trade); setIsTradeModalOpen(true); };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard }, { id: 'log', icon: List },
    { id: 'stats', icon: BarChart3 }, { id: 'day', icon: CalendarDays },
    { id: 'progress', icon: Target }, { id: 'strategy', icon: Activity },
    { id: 'journal', icon: BookOpen }, { id: 'zen', icon: Wind }
  ];

  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-100 overflow-hidden selection:bg-orange-500 selection:text-white relative">
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 pb-16">
        <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-[#121212] z-10 shrink-0 border-b border-gray-100 dark:border-white/5">
          <h1 className="text-base font-bold text-slate-800 dark:text-white capitalize">{currentView.replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setIsStartDayOpen(true)} className="hidden md:flex px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-gray-100 transition-colors">
              Start your trading session
            </button>
            <button 
              onClick={openAddModal} 
              aria-label="Log a new trade"
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Log Trade
            </button>
            
            <label className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer relative hover:bg-gray-100 transition-colors">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span>{`${new Date(dashboardDate.getFullYear(), dashboardDate.getMonth(), 1).toLocaleDateString('en-US', {month:'short', day:'2-digit'})} - ${new Date(dashboardDate.getFullYear(), dashboardDate.getMonth() + 1, 0).toLocaleDateString('en-US', {month:'short', day:'2-digit'})}`}</span>
              <input 
                type="month" 
                value={`${dashboardDate.getFullYear()}-${String(dashboardDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  if (y && m) setDashboardDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            
            <select 
              value={selectedAccountId}
              onChange={(e) => {
                if (e.target.value === 'ADD_NEW') {
                  const name = prompt('Enter new account name:');
                  if (name && name.trim()) {
                    const newId = generateId();
                    setAccounts([...accounts, { id: newId, name: name.trim() }]);
                    setSelectedAccountId(newId);
                  }
                } else {
                  setSelectedAccountId(e.target.value);
                }
              }}
              className="hidden sm:block px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              <option value="ADD_NEW" className="font-bold text-orange-600">+ Add New Account</option>
            </select>
            
            <div className="flex items-center gap-2 ml-1 border-l border-gray-200 dark:border-white/10 pl-3">
              <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button aria-label="Notifications" className="text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              </button>
              <div role="button" aria-label="User profile" tabIndex={0} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer hover:ring-2 ring-orange-400 transition-all">
                <span className="text-white text-[10px] font-bold">JD</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-5 relative">
          {currentView === 'dashboard' && <DashboardView trades={trades} dashboardDate={dashboardDate} setDashboardDate={setDashboardDate} onDayClick={(date, dayTrades) => { setSelectedDayTrades({ date, trades: dayTrades }); setIsDayModalOpen(true); }}/>}
          {currentView === 'log' && <TradeLogView trades={trades} onEdit={openEditModal} />}
          {currentView === 'stats' && <StatsView trades={trades} />}
          {currentView === 'day' && <DayView trades={trades} dashboardDate={dashboardDate} onEdit={openEditModal} />}
          {currentView === 'progress' && <ProgressView trades={trades} />}
          {currentView === 'strategy' && <StrategyView trades={trades} strategies={strategies} setStrategies={setStrategies} />}
          {currentView === 'journal' && <JournalView folders={folders} setFolders={setFolders} notes={notes} setNotes={setNotes} />}
          {currentView === 'zen' && <ZenModeView />}
        </main>
      </div>

      {/* Bottom Floating Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-lg border border-gray-200 dark:border-white/10 p-2 rounded-2xl shadow-xl z-40">
        {navItems.map(nav => (
          <button
            key={nav.id}
            onClick={() => setCurrentView(nav.id)}
            title={nav.id.charAt(0).toUpperCase() + nav.id.slice(1).replace('-', ' ')}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              currentView === nav.id 
                ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' 
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <nav.icon className="w-[18px] h-[18px]" strokeWidth={currentView === nav.id ? 2.5 : 2} />
          </button>
        ))}
        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all relative">
          <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>
        {isSettingsOpen && (
           <div className="absolute bottom-16 right-0 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-xl rounded-xl p-2 flex flex-col z-50">
             <button onClick={() => setIsSettingsOpen(false)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">App Settings</button>
             <button onClick={() => { setIsSettingsOpen(false); setIsAccountModalOpen(true); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Manage Accounts</button>
             <div className="my-1 border-t border-gray-100 dark:border-white/5"></div>
             <button onClick={() => { if (window.confirm('Clear all data?')) clearAllData(); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">Clear All Data</button>
           </div>
        )}
      </div>

      {/* Modals */}
      {isAccountModalOpen && <AccountModal onClose={() => setIsAccountModalOpen(false)} onSelect={() => { setIsAccountModalOpen(false); openAddModal(); }} />}
      {isStartDayOpen && <StartDayModal trades={trades} onClose={() => setIsStartDayOpen(false)} />}
      
      {isTradeModalOpen && (
        editingTrade ? (
          <JournaledTradeModal trade={editingTrade} onClose={() => { setIsTradeModalOpen(false); setEditingTrade(null); }} />
        ) : (
          <TradeModal trade={null} onClose={() => setIsTradeModalOpen(false)} onSave={handleSaveTrade} onDelete={handleDeleteTrade} />
        )
      )}
      {isDayModalOpen && <DayTradesModal date={selectedDayTrades.date} trades={selectedDayTrades.trades} onClose={() => setIsDayModalOpen(false)} onEdit={(t) => { setIsDayModalOpen(false); openEditModal(t); }} />}
    </div>
  );
}

// --- CORE VIEWS ---

function DashboardView({ trades, dashboardDate, setDashboardDate, onDayClick }) {
  const filteredTrades = useMemo(() => {
    const start = new Date(dashboardDate.getFullYear(), dashboardDate.getMonth(), 1).getTime();
    const end = new Date(dashboardDate.getFullYear(), dashboardDate.getMonth() + 1, 0, 23, 59, 59).getTime();
    return trades.filter(t => new Date(t.exitDate).getTime() >= start && new Date(t.exitDate).getTime() <= end);
  }, [trades, dashboardDate]);

  const stats = useMemo(() => {
    if (!filteredTrades.length) return null;
    const s = calculateTradeStats(filteredTrades);
    return {
      totalPnL: s.net, winRate: s.winRate, lossRate: s.lossRate, beRate: 1 - s.winRate - s.lossRate,
      avgWin: s.avgW, avgLoss: s.avgL, expectedValue: s.ev, wins: s.w, losses: s.l,
      profitFactor: s.pf, winLossRatio: s.winLossRatio
    };
  }, [filteredTrades]);

  const comboData = useMemo(() => {
    const dMap = {};
    filteredTrades.forEach(t => { const d = t.exitDate.split('T')[0]; dMap[d] = (dMap[d] || 0) + t.pnl; });
    const dates = Object.keys(dMap).sort(), dArr = [], cArr = [], lbls = [];
    let cum = 0;
    dates.forEach(d => { cum += dMap[d]; dArr.push(dMap[d]); cArr.push(cum); lbls.push(formatDate(d)); });
    return { labels: lbls, dailyArr: dArr, cumArr: cArr };
  }, [filteredTrades]);

  const radarMetrics = useMemo(() => {
    if (!stats) return { score: 0, data: [0,0,0,0,0] };
    const consistencyAxis = Math.max(0, 100 - (stDev(comboData.dailyArr) / 10)); 
    const ruleAxis = filteredTrades.length ? (filteredTrades.filter(t => t.rulesFollowed).length / filteredTrades.length) * 100 : 0;
    const data = [stats.winRate * 100, Math.min(stats.profitFactor * 20, 100), Math.min(stats.winLossRatio * 25, 100), consistencyAxis, ruleAxis];
    return { score: Math.round(data.reduce((a,b)=>a+b,0)/5), data: data.map(Math.round) };
  }, [stats, comboData, filteredTrades]);

  const calendarData = useMemo(() => {
    const year = dashboardDate.getFullYear(), month = dashboardDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate(), firstDay = new Date(year, month, 1).getDay();
    const dStats = {};
    filteredTrades.forEach(t => {
      const d = t.exitDate.split('T')[0];
      if (!dStats[d]) dStats[d] = { pnl: 0, count: 0, wins: 0, trades: [] };
      dStats[d].pnl += t.pnl; dStats[d].count += 1; dStats[d].trades.push(t);
      if (t.pnl > 0) dStats[d].wins += 1;
    });
    const weeks = []; let week = Array(firstDay).fill(null);
    for (let i = 1; i <= days; i++) {
      const dStr = new Date(year, month, i, 12).toISOString().split('T')[0];
      week.push({ day: i, dateStr: dStr, stats: dStats[dStr] });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length) { while(week.length < 7) week.push(null); weeks.push(week); }
    return weeks;
  }, [filteredTrades, dashboardDate]);

  const strategyStats = useMemo(() => {
    const sMap = {};
    filteredTrades.forEach(t => {
      if (t.tags && t.tags.length > 0) {
        t.tags.forEach(tag => {
          if (!sMap[tag]) sMap[tag] = { count: 0, wins: 0, pnl: 0, grossWin: 0, grossLoss: 0 };
          sMap[tag].count++;
          sMap[tag].pnl += t.pnl;
          if (t.pnl > 0) {
            sMap[tag].wins++;
            sMap[tag].grossWin += t.pnl;
          } else {
            sMap[tag].grossLoss += Math.abs(t.pnl);
          }
        });
      }
    });
    return Object.entries(sMap).map(([name, stats]) => {
      const winRate = stats.wins / stats.count;
      const profitFactor = stats.grossLoss === 0 ? (stats.grossWin > 0 ? 99 : 0) : stats.grossWin / stats.grossLoss;
      return { name, ...stats, winRate, profitFactor };
    }).sort((a, b) => b.count - a.count);
  }, [filteredTrades]);

  if (!stats) return <div className="text-center py-20 text-[#9ca3af]">No trades in this range.</div>;

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Net P&L', v: `${stats.totalPnL>0?'+':''}${formatCurrency(stats.totalPnL)}`, c: stats.totalPnL>=0?'text-green-600':'text-red-600' },
          { l: 'Trade Win %', v: formatPercent(stats.winRate), c: 'text-slate-800 dark:text-white', gauge: true },
          { l: 'Avg Win / Loss', v: `${formatCurrency(stats.avgWin)} / ${formatCurrency(stats.avgLoss)}`, c: 'text-slate-800 dark:text-white' },
          { l: 'Expected Value', v: `${stats.expectedValue>0?'+':''}${formatCurrency(stats.expectedValue)}`, c: stats.expectedValue>=0?'text-green-600':'text-red-600', badges: true }
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-[#121212] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{s.l}</span>
            <div className="flex justify-between items-center mt-2">
              <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
              {s.gauge && <div className="w-9 h-9 pb-1"><Doughnut data={{ datasets: [{ data: [stats.winRate, stats.beRate, stats.lossRate], backgroundColor: ['#16a34a', '#a855f7', '#dc2626'], borderWidth: 0, circumference: 180, rotation: 270, cutout: '75%' }] }} options={{ maintainAspectRatio: false, plugins:{tooltip:{enabled:false}} }} /></div>}
              {s.badges && <div className="flex flex-col gap-1"><span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 rounded-full">{stats.wins} W</span><span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 rounded-full">{stats.losses} L</span></div>}
            </div>
          </div>
        ))}
      </div>

      {/* Elegant Chart Row */}
      <div className="flex flex-col xl:flex-row gap-3">

        {/* P&L Chart — clean premium look */}
        <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 xl:w-[45%] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Performance</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">Daily &amp; Cumulative P&amp;L</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span><span className="text-[10px] text-gray-400 font-semibold">Daily</span></div>
              <div className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-orange-400 inline-block rounded-full"></span><span className="text-[10px] text-gray-400 font-semibold">Cumulative</span></div>
            </div>
          </div>
          <div className="flex-1 relative min-h-[210px] px-3 pb-3 pt-2">
            {comboData.labels.length === 0
              ? <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm font-semibold">No data</div>
              : <Chart type="bar" data={{
                  labels: comboData.labels,
                  datasets: [
                    {
                      type: 'line',
                      label: 'Cumulative P&L',
                      data: comboData.cumArr,
                      borderColor: '#f97316',
                      borderWidth: 2,
                      pointRadius: 0,
                      pointHoverRadius: 4,
                      pointHoverBackgroundColor: '#f97316',
                      yAxisID: 'y1',
                      tension: 0.4,
                      fill: false,
                    },
                    {
                      type: 'bar',
                      label: 'Daily P&L',
                      data: comboData.dailyArr,
                      backgroundColor: comboData.dailyArr.map(v => v >= 0 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)'),
                      hoverBackgroundColor: comboData.dailyArr.map(v => v >= 0 ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)'),
                      borderRadius: 4,
                      borderSkipped: false,
                      yAxisID: 'y',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(15,23,42,0.92)',
                      titleColor: '#94a3b8',
                      bodyColor: '#f1f5f9',
                      padding: 10,
                      cornerRadius: 8,
                      titleFont: { size: 10, weight: 'bold' },
                      bodyFont: { size: 11, weight: 'bold' },
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}$${ctx.parsed.y.toFixed(2)}`
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: { font: { size: 9 }, color: '#94a3b8', maxRotation: 0, maxTicksLimit: 8 }
                    },
                    y: {
                      type: 'linear', position: 'left',
                      grid: { color: 'rgba(128,128,128,0.1)', lineWidth: 1 },
                      border: { display: false, dash: [3, 3] },
                      ticks: { font: { size: 9 }, color: '#94a3b8', callback: v => `$${v}` }
                    },
                    y1: { type: 'linear', position: 'right', display: false }
                  }
                }}
              />
            }
          </div>
        </div>

        {/* Avg Win/Loss — elegant stat card */}
        <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 xl:w-[27%] flex flex-col overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50 dark:border-white/5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Risk/Reward</p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">Avg Win / Loss Ratio</h3>
          </div>
          <div className="flex flex-col flex-1 p-5 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Ratio</span>
              <span className={`text-2xl font-black ${stats.winLossRatio >= 1 ? 'text-green-600' : 'text-red-500'}`}>{stats.winLossRatio.toFixed(2)}x</span>
            </div>
            <div className="space-y-3">
              {/* Win bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Avg Win</span>
                  <span className="text-xs font-bold text-green-600">{formatCurrency(stats.avgWin)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.avgWin / (stats.avgWin + stats.avgLoss || 1)) * 100)}%` }}></div>
                </div>
              </div>
              {/* Loss bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Avg Loss</span>
                  <span className="text-xs font-bold text-red-500">{formatCurrency(stats.avgLoss)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.avgLoss / (stats.avgWin + stats.avgLoss || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-3 border-t border-gray-50 dark:border-white/5 grid grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-2.5 text-center">
                <span className="text-green-700 dark:text-green-400 text-xs font-black">{stats.wins}</span>
                <p className="text-[9px] text-green-500 font-semibold uppercase tracking-wide mt-0.5">Wins</p>
              </div>
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-2.5 text-center">
                <span className="text-red-600 dark:text-red-400 text-xs font-black">{stats.losses}</span>
                <p className="text-[9px] text-red-400 font-semibold uppercase tracking-wide mt-0.5">Losses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Journal Score — premium radar */}
        <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 xl:w-[28%] flex flex-col overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50 dark:border-white/5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Analytics</p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">Journal Score</h3>
          </div>
          <div className="flex flex-col flex-1 p-4 gap-2">
            <div className="flex-1 min-h-[130px]">
              <Radar data={{ labels: ['Win %', 'Prof. Factor', 'W/L Ratio', 'Consistency', 'Rules'], datasets: [{ data: radarMetrics.data, backgroundColor: 'rgba(249,115,22,0.08)', borderColor: '#f97316', borderWidth: 1.5, pointBackgroundColor: '#f97316', pointRadius: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(128,128,128,0.1)' }, pointLabels: { font: { size: 9, weight: 'bold' }, color: '#94a3b8' }, angleLines: { color: 'rgba(128,128,128,0.1)' } } }, plugins: { legend: { display: false } } }} />
            </div>
            <div className="pt-3 border-t border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Overall Score</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg font-black ${radarMetrics.score >= 60 ? 'text-green-600' : radarMetrics.score >= 40 ? 'text-orange-500' : 'text-red-500'}`}>{radarMetrics.score}</span>
                  <span className="text-gray-300 text-sm font-bold">/ 100</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${radarMetrics.score >= 60 ? 'bg-gradient-to-r from-green-400 to-green-500' : radarMetrics.score >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} style={{ width: `${radarMetrics.score}%` }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-sm font-bold dark:text-white">{dashboardDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-1"><button onClick={() => setDashboardDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-gray-400"><ChevronLeft className="w-4 h-4"/></button><button onClick={() => setDashboardDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-gray-400"><ChevronRight className="w-4 h-4"/></button></div>
        </div>
        <div className="flex flex-col bg-gray-50 dark:bg-transparent">
          <div className="grid grid-cols-8 gap-px border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#121212]">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>)}
            <div className="py-2 text-center text-[10px] font-bold text-orange-500 uppercase bg-orange-50/50 dark:bg-orange-500/10">Summary</div>
          </div>
          <div className="flex flex-col gap-px bg-gray-100/50 dark:bg-white/5">
            {calendarData.map((week, idx) => {
              const wStats = week.filter(d => d && d.stats).map(d => d.stats);
              const totalPnL = wStats.reduce((s, d) => s + d.pnl, 0), daysTraded = wStats.length;
              const winPct = wStats.reduce((s,d)=>s+d.count,0) > 0 ? wStats.reduce((s,d)=>s+d.wins,0) / wStats.reduce((s,d)=>s+d.count,0) : 0;
              return (
                <div key={idx} className="grid grid-cols-8 gap-px min-h-[70px]">
                  {week.map((d, i) => (
                    <div key={i} onClick={() => d?.stats && onDayClick(d.dateStr, d.stats.trades)} className={`bg-white dark:bg-[#121212] p-2 flex flex-col relative ${d?.stats ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a]' : ''}`}>
                      {d && (<><span className="text-xs font-bold text-gray-400">{d.day}</span>
                      {d.stats && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className={`text-xs font-bold ${d.stats.pnl>=0?'text-green-600':'text-red-600'}`}>{d.stats.pnl>0?'+':''}{formatCurrency(d.stats.pnl)}</span></div>}</>)}
                    </div>
                  ))}
                  <div className="bg-orange-50/20 dark:bg-orange-500/5 p-2 flex flex-col justify-center items-center gap-0.5 border-l-2 border-orange-500/20 dark:border-orange-500/10">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Wk {idx+1}</span>
                    <span className={`text-xs font-bold ${totalPnL>=0?'text-green-600':'text-red-600'}`}>{totalPnL>0?'+':''}{formatCurrency(totalPnL)}</span>
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-gray-400"><span>{formatPercent(winPct)}</span><span>•</span><span>{daysTraded}d</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Strategy Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5 text-gray-400 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 font-bold">Strategy</th>
                <th className="px-4 py-2.5 font-bold text-center">Trades</th>
                <th className="px-4 py-2.5 font-bold text-center">Win Rate</th>
                <th className="px-4 py-2.5 font-bold text-center">Profit Factor</th>
                <th className="px-4 py-2.5 font-bold text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {strategyStats.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No strategy data available</td></tr>
              ) : (
                strategyStats.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-gray-200">{s.name}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500 font-semibold">{s.count}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold w-8 text-right text-gray-700 dark:text-gray-300">{formatPercent(s.winRate)}</span>
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${s.winRate >= 0.5 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, s.winRate * 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-500 font-semibold">{s.profitFactor.toFixed(2)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${s.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.pnl > 0 ? '+' : ''}{formatCurrency(s.pnl)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TradeLogView({ trades, onEdit }) {
  const calcScore = (t) => (t.rulesFollowed ? 30 : 0) + (t.tags?.length ? 30 : 0) + (t.pnl > 0 ? 40 : 0);
  const stats = useMemo(() => calculateTradeStats(trades), [trades]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'entryDate', direction: 'desc' });

  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.symbol.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q)));
    }
    if (statusFilter !== 'All') {
      if (statusFilter === 'Win') result = result.filter(t => t.pnl > 0);
      else if (statusFilter === 'Loss') result = result.filter(t => t.pnl < 0);
      else if (statusFilter === 'BE') result = result.filter(t => t.pnl === 0);
    }
    result.sort((a, b) => {
      let aVal = a[sortConfig.key], bVal = b[sortConfig.key];
      if (sortConfig.key === 'roi') {
        aVal = a.pnl / (a.entryPrice * a.quantity);
        bVal = b.pnl / (b.entryPrice * b.quantity);
      } else if (sortConfig.key === 'score') {
        aVal = calcScore(a); bVal = calcScore(b);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [trades, searchQuery, statusFilter, sortConfig]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return null;
    return <span className="ml-1 inline-block">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Net cumulative P&L</div><div className={`text-xl font-bold mt-1.5 ${stats.net>=0?'text-green-600':'text-red-600'}`}>{formatCurrency(stats.net)}</div></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Profit Factor</div><div className="text-xl font-bold mt-1.5">{stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}</div></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Trade Win %</div><div className="flex justify-between mt-1.5"><div className="text-xl font-bold">{formatPercent(stats.winRate)}</div><div className="flex gap-1"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{stats.w} W</span><span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{stats.be} BE</span><span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{stats.l} L</span></div></div></div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Avg Win/Loss</div><div className="text-xl font-bold mt-1.5">{formatCurrency(stats.avgW)} / {formatCurrency(stats.avgL)}</div></div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search symbol or notes..." className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400 shadow-sm min-w-[250px]" aria-label="Search trades" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400 shadow-sm cursor-pointer" aria-label="Filter by status">
          <option value="All">All Status</option><option value="Win">Win</option><option value="Loss">Loss</option><option value="BE">Break Even</option>
        </select>
        {(searchQuery || statusFilter !== 'All') && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter('All'); }} className="text-xs font-bold text-gray-400 hover:text-orange-500 transition-colors ml-2">Clear Filters</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 text-[10px] uppercase tracking-wide select-none">
              <tr>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('entryDate')}>Open Date<SortIcon column="entryDate"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pnl')}>Net P&L<SortIcon column="pnl"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('symbol')}>Symbol<SortIcon column="symbol"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pnl')}>Status<SortIcon column="pnl"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('exitDate')}>Close Date<SortIcon column="exitDate"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('entryPrice')}>Entry Price<SortIcon column="entryPrice"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('exitPrice')}>Exit Price<SortIcon column="exitPrice"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('roi')}>Net ROI<SortIcon column="roi"/></th>
                <th className="px-4 py-3 font-bold">Strategy</th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rulesFollowed')}>Rules<SortIcon column="rulesFollowed"/></th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort('score')}>Score<SortIcon column="score"/></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSortedTrades.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-10 text-center text-gray-400 font-bold">
                    No trades match the current filters.
                  </td>
                </tr>
              ) : filteredAndSortedTrades.map(t => (
                <tr key={t.id} onClick={() => onEdit(t)} className="hover:bg-orange-50 cursor-pointer transition-colors group">
                  <td className="px-4 py-2.5 font-medium text-gray-500">{formatDate(t.entryDate)}</td>
                  <td className={`px-4 py-2.5 font-bold ${t.pnl>=0?'text-green-600':'text-red-600'}`}>{t.pnl>0?'+':''}{formatCurrency(t.pnl)}</td>
                  <td className="px-4 py-2.5 font-bold">{t.symbol}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.pnl>0?'bg-green-100 text-green-700':t.pnl<0?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>{t.pnl>0?'Win':t.pnl<0?'Loss':'BE'}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(t.exitDate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">${t.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">${t.exitPrice.toFixed(2)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${t.pnl>=0?'text-green-600':'text-red-600'}`}>{formatPercent(t.pnl / (t.entryPrice * t.quantity))}</td>
                  <td className="px-4 py-2.5"><div className="flex gap-1 flex-wrap max-w-[150px]">{t.tags?.map(tag => <span key={tag} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{tag}</span>)}</div></td>
                  <td className="px-4 py-2.5 text-center group-hover:scale-110 transition-transform">{t.rulesFollowed ? '✅' : '❌'}</td>
                  <td className="px-4 py-2.5 font-bold text-center text-slate-700">{calcScore(t)}</td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatsView({ trades }) {
  const [tab, setTab] = useState('Summary');
  const dStats = useMemo(() => calculateTradeStats(trades), [trades]);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex gap-6 border-b border-gray-200">
        <button className="px-2 py-4 font-bold text-orange-500 border-b-2 border-orange-500">Details</button>
        <button className="px-2 py-4 font-bold text-gray-400">Overview</button>
      </div>
      <div className="flex gap-4 items-center">
        <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-sm shadow-sm"><option>Net P&L</option></select>
        <button className="flex items-center gap-2 text-sm font-bold bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm"><Download size={16}/> Export</button>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[300px] relative">
        <div className="absolute top-6 right-6 flex gap-2">
           <select className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold"><option>Net P&L</option></select>
           <div className="bg-gray-50 border border-gray-200 rounded flex overflow-hidden text-xs font-bold"><button className="px-3 py-1 bg-white">Day</button><button className="px-3 py-1">Week</button><button className="px-3 py-1">Month</button></div>
        </div>
        <Line data={{ labels: trades.map(t=>formatDate(t.exitDate)).reverse(), datasets: [{ data: trades.map(t=>t.pnl).reverse(), borderColor: '#f5860a', borderWidth: 2, tension: 0.3 }] }} options={{ maintainAspectRatio: false, plugins: { legend: {display:false} } }} />
      </div>
      <div>
        <div className="flex gap-6 mb-6">
          {['Summary', 'Days', 'Trades'].map(t => <button key={t} onClick={()=>setTab(t)} className={`font-bold text-sm ${tab===t?'text-orange-500':'text-gray-400'}`}>{t}</button>)}
        </div>
        {tab === 'Summary' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm grid grid-cols-4 gap-8 divide-x divide-gray-100">
            <div className="flex flex-col gap-6 pr-8">
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Net P&L</div><div className="text-xl font-bold">{formatCurrency(dStats.net)}</div></div>
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Win %</div><div className="text-xl font-bold">{formatPercent(dStats.winRate)}</div></div>
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Profit Factor</div><div className="text-xl font-bold">{dStats.pf === Infinity ? '∞' : dStats.pf.toFixed(2)}</div></div>
            </div>
            <div className="flex flex-col gap-6 px-8">
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Trade Expectancy</div><div className="text-xl font-bold">{formatCurrency(dStats.ev)}</div></div>
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Avg Hold Time</div><div className="text-xl font-bold">1d 4h</div></div>
            </div>
            <div className="flex flex-col gap-6 px-8">
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Avg Net Trade P&L</div><div className="text-xl font-bold">{formatCurrency(dStats.net / (trades.length||1))}</div></div>
            </div>
            <div className="flex flex-col gap-6 pl-8">
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Logged Days</div><div className="text-xl font-bold">{new Set(trades.map(t=>t.exitDate.split('T')[0])).size}</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayView({ trades, dashboardDate, onEdit }) {
  const [selectedDate, setSelectedDate] = useState(() => dashboardDate.toISOString().split('T')[0]);
  // Get all days that have trades in the selected month
  const year = dashboardDate.getFullYear(), month = dashboardDate.getMonth();
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59).getTime();
  const monthTrades = trades.filter(t => { const d = new Date(t.exitDate).getTime(); return d >= start && d <= end; });
  const tradeDays = useMemo(() => {
    const m = {};
    monthTrades.forEach(t => {
      const d = t.exitDate.split('T')[0];
      if (!m[d]) m[d] = [];
      m[d].push(t);
    });
    return m;
  }, [monthTrades]);
  const dayTrades = tradeDays[selectedDate] || [];
  const dayPnL = dayTrades.reduce((s, t) => s + t.pnl, 0);
  const dayWins = dayTrades.filter(t => t.pnl > 0).length;
  const availableDays = Object.keys(tradeDays).sort();
  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      {/* Date selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select Day</label>
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
          aria-label="Select trading day"
        >
          {availableDays.length === 0 && <option value="">No trading days this month</option>}
          {availableDays.map(d => (
            <option key={d} value={d}>{formatDate(d)}</option>
          ))}
        </select>
        {dayTrades.length > 0 && (
          <div className="flex gap-3 ml-auto">
            <span className={`text-sm font-black ${dayPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>{dayPnL > 0 ? '+' : ''}{formatCurrency(dayPnL)}</span>
            <span className="text-xs font-bold text-gray-400">{dayWins}/{dayTrades.length} wins</span>
          </div>
        )}
      </div>
      {dayTrades.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3"><CalendarDays className="w-6 h-6 text-gray-400" /></div>
          <p className="text-gray-500 font-bold">No trades on {formatDate(selectedDate)}</p>
          <p className="text-gray-400 text-sm mt-1">Select a day above that has trades, or log a new trade.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayTrades.map(t => (
            <div key={t.id} onClick={() => onEdit(t)} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:border-orange-200 border border-transparent transition-colors">
               <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${t.pnl >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{t.symbol.substring(0,2)}</div>
                  <div>
                    <div className="font-bold text-sm">{t.symbol} <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${t.side === 'Long' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{t.side}</span></div>
                    <div className="text-[11px] text-gray-400 font-medium mt-0.5">${t.entryPrice.toFixed(2)} → ${t.exitPrice.toFixed(2)} · {t.quantity} shares</div>
                  </div>
               </div>
               <div className={`text-lg font-black ${t.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>{t.pnl > 0 ? '+' : ''}{formatCurrency(t.pnl)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressView({ trades }) {
  const stats = useMemo(() => calculateTradeStats(trades), [trades]);

  // Build activity grid from real trade data (last 30 weeks = 210 days)
  const activityGrid = useMemo(() => {
    const dayMap = {};
    trades.forEach(t => { const d = t.exitDate.split('T')[0]; dayMap[d] = (dayMap[d] || 0) + 1; });
    const today = new Date();
    const rows = 7; const cols = 26;
    const grid = Array.from({length: rows}, () => Array(cols).fill(0));
    for (let col = cols - 1; col >= 0; col--) {
      for (let row = 0; row < rows; row++) {
        const daysAgo = (cols - 1 - col) * 7 + (6 - row);
        const d = new Date(today); d.setDate(d.getDate() - daysAgo);
        const dStr = d.toISOString().split('T')[0];
        const cnt = dayMap[dStr] || 0;
        grid[row][col] = cnt === 0 ? 0 : cnt <= 2 ? 1 : cnt <= 4 ? 2 : cnt <= 6 ? 3 : 4;
      }
    }
    return grid;
  }, [trades]);

  if (!stats) return (
    <div className="text-center py-20">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3"><Target className="w-6 h-6 text-gray-400" /></div>
      <p className="text-gray-500 font-bold">No trades yet</p>
      <p className="text-gray-400 text-sm mt-1">Log your first trade to start tracking progress.</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Winning Streak</div>
          <div className="text-xl font-bold text-green-600">{stats.streak} days ↗</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Today's P&L</div>
          <div className={`text-xl font-bold ${stats.todayCount === 0 ? 'text-gray-400' : stats.todayPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {stats.todayCount === 0 ? 'No trades today' : `${stats.todayPnL > 0 ? '+' : ''}${formatCurrency(stats.todayPnL)}`}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Rules Followed</div>
          <div className="text-xl font-bold">{formatPercent(stats.rulesPct)}</div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{width:`${stats.rulesPct*100}%`}}></div></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Total Trades</div>
          <div className="text-xl font-bold">{stats.total}</div>
          <div className="flex gap-1.5 mt-1.5">
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{stats.wins} W</span>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">{stats.losses} L</span>
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{stats.tradedDays} days</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xs font-bold text-slate-700 mb-4">Trading Activity <span className="text-gray-300 font-normal">(last 6 months)</span></h3>
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
            {activityGrid.map((row, i) => row.map((cell, j) => (
              <div key={`${i}-${j}`} title={`Activity level ${cell}`} className={`w-3.5 h-3.5 rounded-sm ${cell===0?'bg-gray-100':cell===1?'bg-green-200':cell===2?'bg-green-400':cell===3?'bg-green-600':'bg-green-800'}`}></div>
            )))}
          </div>
        </div>
        <div className="flex gap-2 items-center text-[10px] text-gray-400 font-bold mt-3">Less <div className="flex gap-1">{[100,200,400,600,800].map(l=><div key={l} className={`w-3 h-3 rounded-sm bg-green-${l}`}></div>)}</div> More</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-slate-700 mb-4">Best &amp; Worst Days</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div><p className="text-[10px] font-bold text-green-600 uppercase">Best Day</p><p className="text-xs text-gray-600 font-semibold mt-0.5">{formatDate(stats.bestDay)}</p></div>
              <span className="font-black text-green-600 text-sm">+{formatCurrency(stats.bestPnL)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div><p className="text-[10px] font-bold text-red-500 uppercase">Worst Day</p><p className="text-xs text-gray-600 font-semibold mt-0.5">{formatDate(stats.worstDay)}</p></div>
              <span className="font-black text-red-500 text-sm">{formatCurrency(stats.worstPnL)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-700">Rule Adherence</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-semibold">Rules Followed</span>
              <span className="text-xs font-bold text-green-600">{trades.filter(t=>t.rulesFollowed).length} trades</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{width:`${stats.rulesPct*100}%`}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-semibold">Rules Broken</span>
              <span className="text-xs font-bold text-red-500">{trades.filter(t=>!t.rulesFollowed).length} trades</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{width:`${(1-stats.rulesPct)*100}%`}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyView({ trades, strategies, setStrategies }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  // Aggregate strategy stats from trade tags (same logic as Dashboard)
  const strategyStats = useMemo(() => {
    const sMap = {};
    trades.forEach(t => {
      if (t.tags && t.tags.length > 0) {
        t.tags.forEach(tag => {
          if (!sMap[tag]) sMap[tag] = { count: 0, wins: 0, pnl: 0, grossWin: 0, grossLoss: 0 };
          sMap[tag].count++;
          sMap[tag].pnl += t.pnl;
          if (t.pnl > 0) { sMap[tag].wins++; sMap[tag].grossWin += t.pnl; }
          else { sMap[tag].grossLoss += Math.abs(t.pnl); }
        });
      }
    });
    return Object.entries(sMap).map(([name, s]) => ({
      name, ...s,
      winRate: s.wins / s.count,
      profitFactor: s.grossLoss === 0 ? (s.grossWin > 0 ? 99 : 0) : s.grossWin / s.grossLoss
    })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const best = strategyStats[0];
  const worst = strategyStats[strategyStats.length - 1];
  const bestWR = [...strategyStats].sort((a,b) => b.winRate - a.winRate)[0];
  const mostActive = [...strategyStats].sort((a,b) => b.count - a.count)[0];

  const saveNewStrategy = () => {
    if (newName.trim()) {
      setStrategies([...strategies, { id: generateId(), name: newName.trim() }]);
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Best Performing', val: best ? `${best.name}` : '—', sub: best ? `${best.pnl > 0 ? '+' : ''}${formatCurrency(best.pnl)}` : 'No data', color: best && best.pnl > 0 ? 'text-green-600' : 'text-red-500' },
          { label: 'Worst Performing', val: worst && worst !== best ? `${worst.name}` : '—', sub: worst && worst !== best ? `${formatCurrency(worst.pnl)}` : 'No data', color: 'text-red-500' },
          { label: 'Best Win Rate', val: bestWR ? `${bestWR.name}` : '—', sub: bestWR ? formatPercent(bestWR.winRate) : 'No data', color: 'text-blue-600' },
          { label: 'Most Active', val: mostActive ? `${mostActive.name}` : '—', sub: mostActive ? `${mostActive.count} trades` : 'No data', color: 'text-orange-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{s.label}</div>
            <div className="text-sm font-bold text-slate-800 truncate">{s.val}</div>
            <div className={`text-xs font-bold mt-0.5 ${s.color}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{strategyStats.length} strategies from trade tags</p>
        {isAdding ? (
          <div className="flex gap-2">
            <input type="text" autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewStrategy()} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-400" placeholder="Strategy Name" />
            <button onClick={saveNewStrategy} className="px-3 py-1.5 bg-green-600 text-white font-bold rounded-lg text-xs">Save</button>
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 font-bold rounded-lg text-xs">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-700">+ Create Strategy</button>
        )}
      </div>

      {strategyStats.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3"><Activity className="w-5 h-5 text-gray-400" /></div>
          <p className="text-gray-500 font-bold text-sm">No strategy data yet</p>
          <p className="text-gray-400 text-xs mt-1">Add tags to your trades to track strategy performance.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-bold">Strategy</th>
                <th className="px-4 py-3 font-bold text-center">Trades</th>
                <th className="px-4 py-3 font-bold text-center">Win Rate</th>
                <th className="px-4 py-3 font-bold text-center">Profit Factor</th>
                <th className="px-4 py-3 font-bold text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {strategyStats.map((s, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-bold text-slate-700">{s.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500 font-semibold">{s.count}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold">{formatPercent(s.winRate)}</span>
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.winRate >= 0.5 ? 'bg-green-500' : 'bg-red-400'}`} style={{width:`${s.winRate*100}%`}}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold text-gray-600">{s.profitFactor === 99 ? '∞' : s.profitFactor.toFixed(2)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${s.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>{s.pnl > 0 ? '+' : ''}{formatCurrency(s.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function JournalView({ folders, setFolders, notes, setNotes }) {
  const [activeF, setActiveF] = useState(folders[0]);
  const [activeN, setActiveN] = useState(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fNotes = notes.filter(n => n.folder === activeF);

  const saveNewFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const addNote = () => { const n = {id: generateId(), folder: activeF, title: 'New Note', content: ''}; setNotes([...notes, n]); setActiveN(n); };
  const updateNote = (k, v) => {
     const up = { ...activeN, [k]: v };
     setActiveN(up); setNotes(notes.map(n => n.id === up.id ? up : n));
  };

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-[1500px] mx-auto">
      <div className="w-[250px] border-r border-gray-100 p-4 flex flex-col gap-2 bg-gray-50/50">
         <div className="flex justify-between items-center px-3 py-2 mb-2">
           <span className="font-bold text-xs text-gray-400 uppercase">Folders</span>
           <button onClick={() => setIsAddingFolder(true)}><Plus size={14}/></button>
         </div>
         {isAddingFolder && (
           <input type="text" autoFocus value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewFolder()} onBlur={saveNewFolder} className="border border-gray-200 rounded px-3 py-1.5 text-sm font-bold mx-2 mb-2 focus:outline-none" placeholder="New Folder" />
         )}
         {folders.map(f => (
            <button key={f} onClick={()=>setActiveF(f)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-left transition-colors ${activeF===f?'bg-green-100 text-green-700':'text-gray-600 hover:bg-gray-100'}`}><Folder size={16}/> {f}</button>
         ))}
      </div>
      <div className="w-[300px] border-r border-gray-100 p-4 flex flex-col">
         <div className="flex justify-between items-center mb-4 px-2"><span className="font-bold text-lg">{activeF}</span><button onClick={addNote} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"><Plus size={16}/></button></div>
         <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {!fNotes.length && <div className="text-gray-400 text-sm p-4 text-center">No notes in this folder.</div>}
            {fNotes.map(n => (
               <button key={n.id} onClick={()=>setActiveN(n)} className={`p-4 rounded-xl text-left border transition-colors ${activeN?.id===n.id?'border-orange-500 bg-orange-50/50':'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <div className="font-bold truncate text-gray-800">{n.title}</div>
                  <div className="text-xs text-gray-400 truncate mt-1">{n.content || 'Empty note...'}</div>
               </button>
            ))}
         </div>
      </div>
      <div className="flex-1 p-8 flex flex-col">
         {!activeN ? <div className="flex-1 flex items-center justify-center text-gray-400 font-bold">Select a note to view</div> :
         <div className="flex-1 flex flex-col gap-4">
            <input type="text" value={activeN.title} onChange={e=>updateNote('title', e.target.value)} className="text-3xl font-bold outline-none placeholder-gray-300" placeholder="Note Title" />
            <textarea value={activeN.content} onChange={e=>updateNote('content', e.target.value)} className="flex-1 resize-none outline-none text-gray-600 text-lg leading-relaxed placeholder-gray-300" placeholder="Start typing..."></textarea>
         </div>}
      </div>
    </div>
  );
}

function ZenModeView() {
  const durations = [3, 5, 10, 15];
  const [minutes, setMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    setSecondsLeft(minutes * 60);
    setIsRunning(false);
  }, [minutes]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const resetSession = () => {
    setIsRunning(false);
    setSecondsLeft(minutes * 60);
  };

  const progress = 1 - (secondsLeft / (minutes * 60));
  const timeLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const phases = [
    'Relax your jaw and shoulders',
    'Breathe in for four, out for six',
    'Name the trade you are waiting for',
    'Commit to risk before entry'
  ];

  return (
    <div className="h-full max-w-[1180px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5 min-h-[720px]">
        <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-bold text-[11px] uppercase tracking-[0.22em] mb-3">
              <Wind className="w-4 h-4" /> Reset Room
            </div>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">Trade from neutral.</h2>
            <p className="text-sm text-gray-500 max-w-xl leading-6">
              A short breathing session for pre-market preparation, revenge-trade interruption, or a clean reset after closing a position.
            </p>
          </div>

          <div className="py-12 flex flex-col items-center">
            <div className="relative w-72 h-72 rounded-full bg-[#f8fafc] border border-gray-100 flex items-center justify-center">
              <div
                className="absolute inset-5 rounded-full border-[10px] border-orange-100"
                style={{ background: `conic-gradient(#f97316 ${progress * 360}deg, transparent 0deg)` }}
              />
              <div className="absolute inset-9 rounded-full bg-white shadow-inner border border-gray-100" />
              <div className="relative text-center">
                <div className="text-[64px] font-bold tabular-nums tracking-tight text-slate-900">{timeLabel}</div>
                <div className="text-xs uppercase tracking-[0.25em] text-gray-400 font-bold">quiet timer</div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 flex-wrap justify-center">
              {durations.map(d => (
                <button
                  key={d}
                  onClick={() => setMinutes(d)}
                  className={`h-9 px-4 rounded-lg text-xs font-bold border transition-colors ${minutes === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'}`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => secondsLeft === 0 ? resetSession() : setIsRunning(!isRunning)}
              className="h-11 px-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center gap-2 transition-colors"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start'}
            </button>
            <button
              onClick={resetSession}
              className="h-11 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Session Cues</h3>
            <div className="space-y-3">
              {phases.map((phase, idx) => (
                <div key={phase} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <CheckCircle2 className={`w-4 h-4 ${progress > idx / phases.length ? 'text-orange-500' : 'text-gray-300'}`} />
                  <span className="text-sm font-semibold text-gray-600">{phase}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 flex-1">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Post-Session Note</h3>
            <p className="text-xs text-gray-400 mb-4">Capture the one decision you want your next trade to respect.</p>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              className="w-full min-h-[220px] resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
              placeholder="Example: Wait for confirmation before entering. No trade is also a position."
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
// --- MODALS ---

function StartDayModal({ onClose, trades }) {
  useModalA11y(true, onClose);
  const todayPnL = useMemo(() => trades.filter(t=>t.exitDate.startsWith(new Date().toISOString().split('T')[0])).reduce((s,t)=>s+t.pnl,0), [trades]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="start-day-title" className="fixed inset-0 z-50 bg-[#f7f7f8] flex flex-col">
      <header className="h-20 px-8 flex justify-between items-center bg-white border-b border-gray-100 shrink-0">
        <h1 id="start-day-title" className="text-2xl font-bold">Start Your Day</h1>
        <div className="flex gap-4">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">Complete Prep</button>
          <button onClick={onClose} className="px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl font-bold transition-colors shadow-sm shadow-[#16a34a]/20">Finish Day</button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden flex p-8 gap-8 max-w-[1600px] mx-auto w-full">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Notes</h2>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${todayPnL>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>Net P&L {todayPnL>0?'+':''}{formatCurrency(todayPnL)}</span>
            <button className="text-blue-500 font-bold text-sm ml-auto hover:underline">+ Add template</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-2 border-b border-gray-100 flex gap-1 text-gray-500 bg-gray-50/50">
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><Bold size={16}/></button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><Italic size={16}/></button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><Underline size={16}/></button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><Strikethrough size={16}/></button>
            </div>
            <textarea className="flex-1 w-full p-6 resize-none focus:outline-none text-gray-700 text-lg leading-relaxed placeholder-gray-400" placeholder="Write something, or press '/' for commands"></textarea>
          </div>
        </div>
        <div className="w-[450px] flex flex-col gap-6 overflow-y-auto pb-8 pr-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">{formatDate(new Date())} Checklist</h3>
              <button className="text-orange-500 text-sm font-bold bg-orange-50 px-3 py-1.5 rounded-lg">Progress Tracker</button>
            </div>
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Manual Rules</h4>
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 font-medium">No rules yet. Add rules to get started.</p>
            </div>
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Automatic Rules</h4>
              <div className="flex justify-between items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-100"><span className="font-bold text-gray-700">Max Loss on Day</span><span className="font-bold text-red-500 bg-red-100 px-2 py-1 rounded-md">-$500</span></div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-3 text-gray-700"><span>Progress</span><span>0 / 1</span></div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="w-0 h-full bg-green-500 rounded-full"></div></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6">News Calendar</h3>
            <div className="flex flex-col gap-5">
              {[{t:'08:30',e:'Core CPI m/m',c:'🇺🇸',a:'0.3%',f:'0.3%',p:'0.4%'},{t:'08:30',e:'CPI m/m',c:'🇺🇸',a:'0.4%',f:'0.3%',p:'0.3%'},{t:'10:00',e:'Fed Chair Powell Speaks',c:'🇺🇸',a:'-',f:'-',p:'-'},{t:'10:30',e:'Crude Oil Inventories',c:'🇺🇸',a:'1.4M',f:'0.9M',p:'-1.4M'}].map((ev,i) => (
                 <div key={i} className="flex gap-4 text-sm items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <span className="text-gray-400 font-bold w-10 mt-0.5">{ev.t}</span>
                    <span className="text-xl leading-none mt-0.5">{ev.c}</span>
                    <div className="flex flex-col flex-1 gap-1">
                       <span className="font-bold text-gray-800">{ev.e}</span>
                       <span className="text-[11px] font-bold text-gray-400">Act: {ev.a} | F'cast: {ev.f} | Prev: {ev.p}</span>
                    </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountModal({ onClose, onSelect }) {
  useModalA11y(true, onClose);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="account-modal-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 id="account-modal-title" className="text-xl font-bold text-[#111827]">My Trading Accounts</h2>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600 text-sm hover:bg-gray-50 shadow-sm transition-colors">Sync</button>
            <button className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl font-bold text-sm shadow-sm shadow-[#16a34a]/20 transition-colors">+ Add New Account</button>
            <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-800 ml-2 p-1"><X size={20}/></button>
          </div>
        </div>
        <div className="p-8">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-400 uppercase text-xs border-b border-gray-100 tracking-wider">
              <tr>
                <th className="pb-4 font-bold">Account Name</th>
                <th className="pb-4 font-bold">Broker</th>
                <th className="pb-4 font-bold">Balance</th>
                <th className="pb-4 font-bold">Last Update</th>
                <th className="pb-4 font-bold">Type</th>
                <th className="pb-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-5 font-bold text-gray-900">Default Account</td>
                <td className="py-5 text-gray-500 font-medium">manual</td>
                <td className="py-5 font-bold text-gray-900">$0.00</td>
                <td className="py-5 text-gray-500 font-medium">Never</td>
                <td className="py-5"><span className="bg-gray-100 px-3 py-1 rounded-md text-gray-600 text-xs font-bold">Inactive</span></td>
                <td className="py-5 text-right">
                  <button onClick={() => onSelect('Default Account')} className="w-8 h-8 bg-[#16a34a]/10 text-[#16a34a] rounded-full flex items-center justify-center hover:bg-[#16a34a]/20 transition-colors ml-auto">
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TradeModal({ trade, onClose, onSave, onDelete }) {
  useModalA11y(true, onClose);
  const isEdit = !!trade;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tradeType, setTradeType] = useState(trade?.tradeType || 'Futures');
  const [tradeRating, setTradeRating] = useState(trade?.tradeRating || '');
  const [mistakeTags, setMistakeTags] = useState(trade?.mistakeTags || []);
  const [mistakeInput, setMistakeInput] = useState('');
  const [customTags, setCustomTags] = useState(trade?.tags || []);
  const [customTagInput, setCustomTagInput] = useState('');
  const journalPrompts = [
    { key: 'Entry Details', label: 'Entry', question: 'What exact trigger made you enter?', placeholder: 'Example: Pullback held VWAP and broke previous candle high.' },
    { key: 'Strategy', label: 'Strategy', question: 'Which strategy or model was this trade?', placeholder: 'Example: Opening range breakout, A+ continuation, liquidity sweep.' },
    { key: 'Model', label: 'Model', question: 'What market model did you see?', placeholder: 'Example: Trend continuation, mean reversion, range expansion.' },
    { key: 'Psychology', label: 'Psychology', question: 'What was your mental state before entry?', placeholder: 'Calm, rushed, revenge, patient, uncertain...' },
    { key: 'Management', label: 'Management', question: 'Did you manage the trade according to plan?', placeholder: 'What did you do well or change mid-trade?' },
    { key: 'Lesson', label: 'Lesson', question: 'What is the one lesson from this trade?', placeholder: 'One short takeaway is enough.' }
  ];
  const [modalStep, setModalStep] = useState('details');
  const [activePrompt, setActivePrompt] = useState(0);
  const [journalAnswers, setJournalAnswers] = useState(trade?.journalAnswers || {});

  const [formData, setFormData] = useState(trade || {
    symbol: '', side: 'Long', entryPrice: '', exitPrice: '', quantity: '',
    entryDate: getInputDate(new Date()), exitDate: getInputDate(new Date()),
    fees: '0', notes: '',
    commissions: '0', profitTarget: '', stopLoss: '',
    initialTarget: '', tradeRisk: '', plannedR: '', realizedR: '',
    entryTime: '', exitTime: '',
  });

  const pnlPreview = useMemo(() => calcPnL(formData.side, parseFloat(formData.entryPrice), parseFloat(formData.exitPrice), parseFloat(formData.quantity), parseFloat(formData.fees)), [formData]);
  const grossPnL = useMemo(() => calcPnL(formData.side, parseFloat(formData.entryPrice), parseFloat(formData.exitPrice), parseFloat(formData.quantity), 0), [formData]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const persistTrade = () => {
    onSave({
      id: trade ? trade.id : generateId(), ...formData,
      entryPrice: parseFloat(formData.entryPrice) || 0, exitPrice: parseFloat(formData.exitPrice) || 0,
      quantity: parseFloat(formData.quantity) || 0, fees: parseFloat(formData.fees || 0),
      symbol: formData.symbol.toUpperCase(), pnl: pnlPreview, rulesFollowed: true,
      tradeType, tradeRating, mistakeTags, tags: customTags, journalAnswers,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseFloat(formData.quantity) <= 0) {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }
    if (new Date(formData.exitDate) < new Date(formData.entryDate)) {
      setErrorMsg('Exit date cannot be before entry date');
      return;
    }
    if (parseFloat(formData.entryPrice) < 0 || parseFloat(formData.exitPrice) < 0) {
      setErrorMsg('Prices cannot be negative');
      return;
    }
    
    setErrorMsg('');
    if (modalStep === 'details') {
      setModalStep('journal');
      return;
    }
    persistTrade();
  };

  const setJournalAnswer = (value) => {
    setJournalAnswers(prev => ({ ...prev, [journalPrompts[activePrompt].key]: value }));
  };

  const movePrompt = (direction) => {
    setActivePrompt(prev => Math.max(0, Math.min(journalPrompts.length - 1, prev + direction)));
  };

  const skipPrompt = () => movePrompt(1);

  const addMistakeTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && mistakeInput.trim()) {
      e.preventDefault();
      if (!mistakeTags.includes(mistakeInput.trim())) setMistakeTags([...mistakeTags, mistakeInput.trim()]);
      setMistakeInput('');
    }
  };
  const addCustomTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && customTagInput.trim()) {
      e.preventDefault();
      if (!customTags.includes(customTagInput.trim())) setCustomTags([...customTags, customTagInput.trim()]);
      setCustomTagInput('');
    }
  };

  const TYPES = ['Stock', 'Futures', 'Forex', 'Options', 'Crypto'];
  const RATINGS = [
    { label: 'F', color: 'text-red-600 border-red-300 bg-red-50' },
    { label: 'D', color: 'text-orange-600 border-orange-300 bg-orange-50' },
    { label: 'C', color: 'text-yellow-600 border-yellow-300 bg-yellow-50' },
    { label: 'B-', color: 'text-blue-600 border-blue-300 bg-blue-50' },
    { label: 'A', color: 'text-green-600 border-green-300 bg-green-50' },
  ];

  const ALL_SYMBOLS = [
    // Stocks
    { s: 'AAPL', n: 'Apple Inc.', cat: 'Stock' },
    { s: 'MSFT', n: 'Microsoft Corp.', cat: 'Stock' },
    { s: 'GOOGL', n: 'Alphabet Inc.', cat: 'Stock' },
    { s: 'AMZN', n: 'Amazon.com Inc.', cat: 'Stock' },
    { s: 'TSLA', n: 'Tesla Inc.', cat: 'Stock' },
    { s: 'META', n: 'Meta Platforms', cat: 'Stock' },
    { s: 'NVDA', n: 'NVIDIA Corp.', cat: 'Stock' },
    { s: 'AMD', n: 'Advanced Micro Devices', cat: 'Stock' },
    { s: 'NFLX', n: 'Netflix Inc.', cat: 'Stock' },
    { s: 'SPY', n: 'S&P 500 ETF', cat: 'Stock' },
    { s: 'QQQ', n: 'NASDAQ-100 ETF', cat: 'Stock' },
    { s: 'BA', n: 'Boeing Co.', cat: 'Stock' },
    { s: 'JPM', n: 'JPMorgan Chase', cat: 'Stock' },
    { s: 'GS', n: 'Goldman Sachs', cat: 'Stock' },
    // Futures
    { s: 'NQ', n: 'NASDAQ-100 Futures', cat: 'Futures' },
    { s: 'ES', n: 'S&P 500 Futures', cat: 'Futures' },
    { s: 'MES', n: 'Micro E-Mini S&P 500', cat: 'Futures' },
    { s: 'MNQ', n: 'Micro E-Mini NASDAQ', cat: 'Futures' },
    { s: 'RTY', n: 'Russell 2000 Futures', cat: 'Futures' },
    { s: 'YM', n: 'Dow Jones Futures', cat: 'Futures' },
    { s: 'CL', n: 'Crude Oil Futures', cat: 'Futures' },
    { s: 'GC', n: 'Gold Futures', cat: 'Futures' },
    { s: 'SI', n: 'Silver Futures', cat: 'Futures' },
    // Forex
    { s: 'EURUSD', n: 'Euro / US Dollar', cat: 'Forex' },
    { s: 'GBPUSD', n: 'British Pound / USD', cat: 'Forex' },
    { s: 'USDJPY', n: 'USD / Japanese Yen', cat: 'Forex' },
    { s: 'AUDUSD', n: 'Australian Dollar / USD', cat: 'Forex' },
    // Crypto
    { s: 'BTCUSD', n: 'Bitcoin / USD', cat: 'Crypto' },
    { s: 'ETHUSD', n: 'Ethereum / USD', cat: 'Crypto' },
    { s: 'SOLUSD', n: 'Solana / USD', cat: 'Crypto' },
  ];

  const [symbolOpen, setSymbolOpen] = useState(false);
  const symbolRef = useRef(null);

  const symbolQuery = formData.symbol.toUpperCase();
  const filteredSymbols = useMemo(() => {
    if (!symbolQuery) return ALL_SYMBOLS.filter(s => tradeType === 'All' || s.cat === tradeType).slice(0, 8);
    return ALL_SYMBOLS.filter(s => s.s.startsWith(symbolQuery) || s.n.toUpperCase().includes(symbolQuery)).slice(0, 8);
  }, [symbolQuery, tradeType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (symbolRef.current && !symbolRef.current.contains(e.target)) setSymbolOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-orange-400 focus:outline-none focus:bg-white transition-colors";
  const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="trade-modal-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <h2 id="trade-modal-title" className="text-base font-bold text-slate-800">{isEdit ? 'Edit Trade' : 'Log Trade'}</h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{new Date(formData.exitDate || new Date()).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
            </div>
            {errorMsg && <div className="ml-4 px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold animate-pulse">{errorMsg}</div>}
          </div>
          <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {modalStep === 'details' ? (
          <>

          {/* LEFT PANEL */}
          <form id="trade-form" onSubmit={handleSubmit} className="w-full md:w-[52%] border-b md:border-b-0 md:border-r border-gray-100 flex flex-col overflow-y-auto">

            {/* Type selector */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-50">
              <p className={labelCls}>Type</p>
              <div className="flex gap-1.5">
                {TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setTradeType(t)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${tradeType === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Trade Data */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-2">Trade Data <span className="text-gray-300 text-[10px] font-medium">Fill in your trade details</span></p>

              {/* Symbol & Net P&L */}
              <div className="grid grid-cols-2 gap-3">
                <div ref={symbolRef} className="relative">
                  <label className={labelCls}>Symbol</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="symbol"
                      value={formData.symbol}
                      onChange={(e) => { handleChange(e); setSymbolOpen(true); }}
                      onFocus={() => setSymbolOpen(true)}
                      className={`${inputCls} pr-8 uppercase font-bold`}
                      placeholder="e.g. AAPL"
                      autoComplete="off"
                      required
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  {/* Dropdown */}
                  {symbolOpen && filteredSymbols.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          {symbolQuery ? `Results for "${symbolQuery}"` : `Popular ${tradeType} Symbols`}
                        </span>
                      </div>
                      <div className="max-h-[180px] overflow-y-auto">
                        {filteredSymbols.map(sym => (
                          <button
                            key={sym.s}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); setFormData(p => ({...p, symbol: sym.s})); setSymbolOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-orange-50 transition-colors text-left group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-5 bg-slate-100 group-hover:bg-orange-100 rounded text-[9px] font-black text-slate-600 group-hover:text-orange-600 flex items-center justify-center transition-colors">{sym.cat.slice(0,3).toUpperCase()}</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">{sym.s}</p>
                                <p className="text-[9px] text-gray-400 font-medium">{sym.n}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-orange-400 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Net P&L</label>
                  <div className={`${inputCls} ${pnlPreview >= 0 ? 'text-green-600' : 'text-red-500'} cursor-default`}>{pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}</div>
                </div>
              </div>

              {/* Side toggle */}
              <div>
                <label className={labelCls}>Side</label>
                <div className="flex gap-1.5">
                  {['Long', 'Short'].map(s => (
                    <button key={s} type="button" onClick={() => setFormData(p => ({...p, side: s}))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${formData.side === s ? (s === 'Long' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500') : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Entry, Exit, Qty */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Entry Price</label>
                  <input type="number" step="any" min="0" name="entryPrice" value={formData.entryPrice} onChange={handleChange} className={inputCls} placeholder="0.00" required />
                </div>
                <div>
                  <label className={labelCls}>Exit Price</label>
                  <input type="number" step="any" min="0" name="exitPrice" value={formData.exitPrice} onChange={handleChange} className={inputCls} placeholder="0.00" required />
                </div>
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input type="number" step="any" min="0.0001" name="quantity" value={formData.quantity} onChange={handleChange} className={inputCls} placeholder="0" required />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Entry Date</label>
                  <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Exit Date</label>
                  <input type="date" name="exitDate" value={formData.exitDate} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Entry Time</label>
                  <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Exit Time</label>
                  <input type="time" name="exitTime" value={formData.exitTime} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              {/* Commissions & Gross P&L */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Commissions & Fees</label>
                  <input type="number" step="any" min="0" name="fees" value={formData.fees} onChange={handleChange} className={inputCls} placeholder="$0.00" />
                </div>
                <div>
                  <label className={labelCls}>Gross P&L</label>
                  <div className={`${inputCls} ${grossPnL >= 0 ? 'text-green-600' : 'text-red-500'} cursor-default`}>{grossPnL >= 0 ? '+' : ''}{formatCurrency(grossPnL)}</div>
                </div>
              </div>

              {/* Risk / Targets */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Profit Target</label>
                  <input type="number" step="any" name="profitTarget" value={formData.profitTarget} onChange={handleChange} className={inputCls} placeholder="$0.00" />
                </div>
                <div>
                  <label className={labelCls}>Stop Loss</label>
                  <input type="number" step="any" name="stopLoss" value={formData.stopLoss} onChange={handleChange} className={inputCls} placeholder="$0.00" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Trade Risk</label>
                  <input type="number" step="any" name="tradeRisk" value={formData.tradeRisk} onChange={handleChange} className={inputCls} placeholder="$0.00" />
                </div>
                <div>
                  <label className={labelCls}>Planned R</label>
                  <input type="number" step="any" name="plannedR" value={formData.plannedR} onChange={handleChange} className={inputCls} placeholder="0.0" />
                </div>
                <div>
                  <label className={labelCls}>Realized R</label>
                  <input type="number" step="any" name="realizedR" value={formData.realizedR} onChange={handleChange} className={inputCls} placeholder="0.0" />
                </div>
              </div>

              {/* Mistakes tags */}
              <div>
                <label className={labelCls}>Mistakes</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 min-h-[36px] focus-within:ring-1 focus-within:ring-orange-400 focus-within:bg-white transition-colors">
                  {mistakeTags.map(tag => (
                    <span key={tag} className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      {tag} <button type="button" onClick={() => setMistakeTags(mistakeTags.filter(t => t !== tag))} className="hover:text-red-900">×</button>
                    </span>
                  ))}
                  <input value={mistakeInput} onChange={e => setMistakeInput(e.target.value)} onKeyDown={addMistakeTag} className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none flex-1 min-w-[100px] placeholder-gray-400" placeholder="Add mistake tags..." />
                </div>
              </div>

              {/* Custom tags */}
              <div>
                <label className={labelCls}>Custom Tags</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 min-h-[36px] focus-within:ring-1 focus-within:ring-orange-400 focus-within:bg-white transition-colors">
                  {customTags.map(tag => (
                    <span key={tag} className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      {tag} <button type="button" onClick={() => setCustomTags(customTags.filter(t => t !== tag))} className="hover:text-orange-900">×</button>
                    </span>
                  ))}
                  <input value={customTagInput} onChange={e => setCustomTagInput(e.target.value)} onKeyDown={addCustomTag} className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none flex-1 min-w-[100px] placeholder-gray-400" placeholder="Add custom tags..." />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className={`${inputCls} resize-none`} placeholder="Trade rationale, observations..." />
              </div>
            </div>
          </form>

          {/* RIGHT PANEL */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50/40">

            {/* Strategies */}
            <div className="mx-4 mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-slate-700">Strategies</p>
              </div>
              <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500">No strategies found</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Attach a strategy to track performance</p>
                </div>
                <button type="button" className="mt-1 px-4 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-colors">Create Your First Strategy</button>
              </div>
            </div>

            {/* Attachments */}
            <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-slate-700">Attachments</p>
              </div>
              <div className="p-4">
                <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all group">
                  <div className="w-9 h-9 bg-green-50 group-hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
                    <Download className="w-4 h-4 text-green-500 rotate-180" />
                  </div>
                  <p className="text-[10px] font-semibold text-gray-400">Add your media</p>
                  <p className="text-[9px] text-gray-300">PNG, JPG, MP4 up to 10MB</p>
                  <input type="file" className="hidden" accept="image/*,video/*" multiple />
                </label>
              </div>
            </div>

            {/* Trade Rating */}
            <div className="mx-4 mt-3 mb-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-slate-700">Trade Rating</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  {RATINGS.map(r => (
                    <button key={r.label} type="button" onClick={() => setTradeRating(tradeRating === r.label ? '' : r.label)}
                      className={`flex-1 py-2.5 text-xs font-black rounded-xl border-2 transition-all ${tradeRating === r.label ? r.color + ' shadow-sm scale-105' : 'border-gray-100 text-gray-400 bg-gray-50 hover:border-gray-200'}`}
                    >{r.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </>
          ) : (
          <div className="flex flex-1 bg-gray-50/40 overflow-hidden">
            <div className="w-[190px] border-r border-gray-100 bg-white p-4 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-2 mb-2">Skip questions</div>
              {journalPrompts.map((prompt, idx) => {
                const answered = String(journalAnswers[prompt.key] || '').trim();
                return (
                  <button
                    key={prompt.key}
                    type="button"
                    onClick={() => setActivePrompt(idx)}
                    className={`text-left rounded-lg px-3 py-2 border transition-colors ${activePrompt === idx ? 'border-orange-400 bg-orange-50 text-orange-700' : answered ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wide">{prompt.label}</div>
                    <div className="text-[10px] font-semibold opacity-70">{answered ? 'Answered' : 'Skip or answer'}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.25em]">Journal Step {activePrompt + 1} / {journalPrompts.length}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">{journalPrompts[activePrompt].question}</h3>
                  </div>
                  <button type="button" onClick={skipPrompt} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold">Skip</button>
                </div>

                <textarea
                  autoFocus
                  value={journalAnswers[journalPrompts[activePrompt].key] || ''}
                  onChange={e => setJournalAnswer(e.target.value)}
                  onKeyDown={e => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') movePrompt(1);
                  }}
                  className="w-full min-h-[180px] resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                  placeholder={journalPrompts[activePrompt].placeholder}
                />

                <div className="mt-6 flex items-center justify-between">
                  <button type="button" onClick={() => movePrompt(-1)} disabled={activePrompt === 0} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 text-xs font-bold">Back</button>
                  <button type="button" onClick={() => activePrompt === journalPrompts.length - 1 ? persistTrade() : movePrompt(1)} className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 text-xs font-bold">
                    {activePrompt === journalPrompts.length - 1 ? 'Finish & Save' : 'Next Question'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Preview P&L</p>
              <p className={`text-base font-black ${pnlPreview >= 0 ? 'text-green-600' : 'text-red-500'}`}>{pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}</p>
            </div>
            {tradeRating && <span className="text-[10px] font-bold text-gray-400">Rating: <span className="text-slate-700">{tradeRating}</span></span>}
          </div>
          <div className="flex gap-2">
            {isEdit && (
              confirmDelete
                ? <button type="button" onClick={() => onDelete(trade.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold transition-colors">Yes, Delete</button>
                : <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">Delete</button>
            )}
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors">Cancel</button>
            {modalStep === 'details' ? (
              <button type="submit" form="trade-form" className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">Next</button>
            ) : (
              <button type="button" onClick={persistTrade} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">Save Trade</button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function DayTradesModal({ date, trades, onClose, onEdit }) {
  useModalA11y(true, onClose);
  if (!date) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="day-trades-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/20 backdrop-blur-sm p-4">
      <div className="bg-[#ffffff] rounded-3xl w-full max-w-lg shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="flex justify-between p-6 border-b border-[rgba(0,0,0,0.06)]">
          <h2 id="day-trades-title" className="text-lg font-bold text-[#111827]">Trades on {formatDate(date)}</h2>
          <button aria-label="Close" onClick={onClose} className="text-[#9ca3af] hover:text-[#111827]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {trades.map(t => (
            <div key={t.id} onClick={() => onEdit(t)} className="flex justify-between py-4 border-b border-[rgba(0,0,0,0.04)] last:border-0 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-xl transition-colors">
               <div className="flex flex-col"><span className="font-bold text-gray-900">{t.symbol}</span><span className="text-xs text-gray-400 font-bold">{t.side}</span></div>
               <span className={`font-bold text-lg ${t.pnl >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>{t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
