import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, List, Calendar as CalendarIcon, Plus, 
  Settings, X, TrendingUp, Bell, User, CalendarDays,
  ChevronLeft, ChevronRight, BarChart3, Target, Activity, 
  BookOpen, Wind, Bold, Italic, Underline, Strikethrough,
  Download, FileText, Folder
} from 'lucide-react';
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

const generateSeedData = () => {
  const trades = [];
  const today = new Date(2026, 5, 30);
  
  const symbols = ['AAPL', 'TSLA', 'SPY', 'QQQ', 'MSFT', 'NVDA', 'AMD'];
  const sides = ['Long', 'Short'];
  const tags = ['Breakout', 'Pullback', 'FOMO', 'News', 'Earnings'];

  for (let i = 25; i >= 0; i--) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - i - Math.floor(Math.random() * 2));
    const exitDate = new Date(entryDate);
    exitDate.setDate(entryDate.getDate() + Math.floor(Math.random() * 2));

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const entryPrice = 100 + Math.random() * 200;
    
    const isWin = Math.random() < 0.6;
    const priceChange = entryPrice * (Math.random() * 0.05);
    const exitPrice = side === 'Long' 
      ? (isWin ? entryPrice + priceChange : entryPrice - priceChange)
      : (isWin ? entryPrice - priceChange : entryPrice + priceChange);

    const quantity = Math.floor(1000 / entryPrice);
    const fees = 1.50;
    const pnl = calcPnL(side, entryPrice, exitPrice, quantity, fees);

    trades.push({
      id: generateId(), symbol, side, entryPrice: parseFloat(entryPrice.toFixed(2)),
      exitPrice: parseFloat(exitPrice.toFixed(2)), quantity, entryDate: entryDate.toISOString(),
      exitDate: exitDate.toISOString(), fees, notes: 'Seed trade for demo.',
      tags: [tags[Math.floor(Math.random() * tags.length)]], pnl: parseFloat(pnl.toFixed(2)),
      rulesFollowed: Math.random() > 0.3
    });
  }
  return trades.sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate));
};

export default function App() {
  // Global States
  const [trades, setTrades] = useState(() => { const s = localStorage.getItem('tradePath_data'); return s ? JSON.parse(s) : generateSeedData(); });
  const [strategies, setStrategies] = useState(() => { const s = localStorage.getItem('tradePath_strategies'); return s ? JSON.parse(s) : []; });
  const [folders, setFolders] = useState(() => { const s = localStorage.getItem('tradePath_folders'); return s ? JSON.parse(s) : ['Daily Journal', 'Trade Notes', 'Strategy Notes', 'Other', 'Welcome']; });
  const [notes, setNotes] = useState(() => { const s = localStorage.getItem('tradePath_notes'); return s ? JSON.parse(s) : []; });
  
  // UI States
  const [currentView, setCurrentView] = useState('dashboard');
  const [dashboardDate, setDashboardDate] = useState(() => new Date(2026, 5, 1));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Modal States
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayTrades, setSelectedDayTrades] = useState({ date: null, trades: [] });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isStartDayOpen, setIsStartDayOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tradePath_data', JSON.stringify(trades));
    localStorage.setItem('tradePath_strategies', JSON.stringify(strategies));
    localStorage.setItem('tradePath_folders', JSON.stringify(folders));
    localStorage.setItem('tradePath_notes', JSON.stringify(notes));
  }, [trades, strategies, folders, notes]);

  const clearAllData = () => {
    setTrades([]); setStrategies([]); setNotes([]);
    setShowClearConfirm(false);
  };

  const handleSaveTrade = (tradeData) => {
    if (editingTrade) setTrades(trades.map(t => t.id === editingTrade.id ? tradeData : t));
    else setTrades([tradeData, ...trades].sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate)));
    setIsTradeModalOpen(false);
    setEditingTrade(null);
  };

  const handleDeleteTrade = (id) => {
    setTrades(trades.filter(t => t.id !== id));
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
    <div className="flex h-screen bg-[#f7f7f8] text-[#111827] font-sans overflow-hidden selection:bg-[#f5860a] selection:text-white">
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>

      {/* Sidebar */}
      <div className="w-[70px] bg-[#ffffff] border-r border-[rgba(0,0,0,0.06)] flex flex-col z-20 shrink-0">
        <div className="h-20 flex items-center justify-center border-b border-[rgba(0,0,0,0.06)] shrink-0">
          <div className="w-9 h-9 bg-[#f5860a] rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(245,134,10,0.3)]">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        </div>

        <nav className="flex-1 py-6 flex flex-col items-center space-y-2 w-full overflow-y-auto overflow-x-hidden">
          {navItems.map(nav => (
            <button
              key={nav.id} onClick={() => setCurrentView(nav.id)} title={nav.id}
              className={`w-full h-12 flex items-center justify-center relative transition-colors ${
                currentView === nav.id ? 'text-[#f5860a]' : 'text-[#9ca3af] hover:text-[#6b7280] hover:bg-gray-50'
              }`}
            >
              {currentView === nav.id && (
                <><div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#f5860a] rounded-r-md" />
                <div className="absolute inset-x-2 inset-y-1 bg-[#f5860a]/10 rounded-xl" /></>
              )}
              <nav.icon className="w-5 h-5 relative z-10" />
            </button>
          ))}
        </nav>

        <div className="pb-6 pt-2 flex flex-col items-center space-y-4 w-full shrink-0 relative">
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-[#f5860a] hover:bg-[#e07909] text-white rounded-full transition-colors shadow-md shadow-[#f5860a]/20"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <button onClick={() => setShowClearConfirm(true)} className="w-10 h-10 flex items-center justify-center text-[#9ca3af] hover:text-[#dc2626] hover:bg-red-50 rounded-xl transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          {showClearConfirm && (
             <div className="absolute bottom-16 left-20 w-48 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50 flex flex-col gap-3">
               <span className="text-sm font-bold text-gray-800">Clear all data?</span>
               <div className="flex gap-2">
                 <button onClick={clearAllData} className="flex-1 bg-red-100 text-red-600 text-xs font-bold py-1.5 rounded-lg hover:bg-red-200">Yes</button>
                 <button onClick={() => setShowClearConfirm(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-1.5 rounded-lg hover:bg-gray-200">No</button>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-20 flex items-center justify-between px-8 bg-[#f7f7f8] z-10 shrink-0 border-b border-[rgba(0,0,0,0.03)]">
          <h1 className="text-[22px] font-bold text-[#111827] capitalize">{currentView.replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setIsStartDayOpen(true)} className="hidden md:flex px-4 py-2 bg-white border border-[rgba(0,0,0,0.1)] rounded-xl text-sm font-bold text-[#111827] hover:bg-gray-50 transition-colors shadow-sm">
              Start your trading session
            </button>
            <button 
              onClick={() => setIsAccountModalOpen(true)} 
              className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm shadow-[#16a34a]/20"
            >
              <Plus className="w-4 h-4" /> Log Trade
            </button>
            
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white border border-[rgba(0,0,0,0.1)] rounded-xl text-sm font-semibold text-[#111827] shadow-sm">
              <CalendarDays className="w-4 h-4 text-[#9ca3af]" />
              {`${new Date(dashboardDate.getFullYear(), dashboardDate.getMonth(), 1).toLocaleDateString('en-US', {month:'short', day:'2-digit'})} - ${new Date(dashboardDate.getFullYear(), dashboardDate.getMonth() + 1, 0).toLocaleDateString('en-US', {month:'short', day:'2-digit'})}`}
            </div>
            
            <select className="hidden sm:block px-3 py-2 bg-white border border-[rgba(0,0,0,0.1)] rounded-xl text-sm font-semibold text-[#111827] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#f5860a]">
              <option>Default Account</option>
            </select>
            
            <div className="flex items-center gap-3 ml-2 border-l border-[rgba(0,0,0,0.1)] pl-5">
              <button className="text-[#9ca3af] hover:text-[#111827] transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#dc2626] rounded-full border border-[#f7f7f8]"></span>
              </button>
              <div className="w-9 h-9 rounded-full bg-gray-200 border border-[rgba(0,0,0,0.06)] flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 ring-[#f5860a] transition-all">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8 relative">
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

      {/* Modals */}
      {isAccountModalOpen && <AccountModal onClose={() => setIsAccountModalOpen(false)} onSelect={() => { setIsAccountModalOpen(false); openAddModal(); }} />}
      {isStartDayOpen && <StartDayModal trades={trades} onClose={() => setIsStartDayOpen(false)} />}
      
      {isTradeModalOpen && <TradeModal trade={editingTrade} onClose={() => setIsTradeModalOpen(false)} onSave={handleSaveTrade} onDelete={handleDeleteTrade} />}
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
    const wins = filteredTrades.filter(t => t.pnl > 0), losses = filteredTrades.filter(t => t.pnl < 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0), grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const winRate = wins.length / filteredTrades.length, lossRate = losses.length / filteredTrades.length;
    const avgWin = wins.length ? grossProfit / wins.length : 0, avgLoss = losses.length ? grossLoss / losses.length : 0;
    return { 
      totalPnL: filteredTrades.reduce((s, t) => s + t.pnl, 0), winRate, lossRate, beRate: 1 - winRate - lossRate,
      avgWin, avgLoss, expectedValue: (winRate * avgWin) - (lossRate * avgLoss), wins: wins.length, losses: losses.length,
      profitFactor: grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss,
      winLossRatio: avgLoss === 0 ? (avgWin > 0 ? 99 : 0) : avgWin / avgLoss
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

  if (!stats) return <div className="text-center py-20 text-[#9ca3af]">No trades in this range.</div>;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { l: 'Net P&L', v: `${stats.totalPnL>0?'+':''}${formatCurrency(stats.totalPnL)}`, c: stats.totalPnL>=0?'text-[#16a34a]':'text-[#dc2626]' },
          { l: 'Trade Win %', v: formatPercent(stats.winRate), c: 'text-[#111827]', gauge: true },
          { l: 'Avg Win/Loss per Trade', v: `${formatCurrency(stats.avgWin)} / ${formatCurrency(stats.avgLoss)}`, c: 'text-[#111827]' },
          { l: 'Expected Value', v: `${stats.expectedValue>0?'+':''}${formatCurrency(stats.expectedValue)}`, c: stats.expectedValue>=0?'text-[#16a34a]':'text-[#dc2626]', badges: true }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-[#9ca3af] uppercase">{s.l}</span>
            <div className="flex justify-between items-center mt-3">
              <div className={`text-3xl font-bold ${s.c}`}>{s.v}</div>
              {s.gauge && <div className="w-12 h-12 pb-2"><Doughnut data={{ datasets: [{ data: [stats.winRate, stats.beRate, stats.lossRate], backgroundColor: ['#16a34a', '#a855f7', '#dc2626'], borderWidth: 0, circumference: 180, rotation: 270, cutout: '75%' }] }} options={{ maintainAspectRatio: false, plugins:{tooltip:{enabled:false}} }} /></div>}
              {s.badges && <div className="flex flex-col gap-1"><span className="bg-green-100 text-green-700 text-[11px] font-bold px-2 rounded-full">{stats.wins} W</span><span className="bg-red-100 text-red-700 text-[11px] font-bold px-2 rounded-full">{stats.losses} L</span></div>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm xl:w-[40%] flex flex-col min-h-[340px]">
          <h3 className="text-xs font-bold text-[#9ca3af] uppercase mb-6">Daily & Cumulative P&L</h3>
          <div className="flex-1 relative">
            {comboData.labels.length === 0 ? <div className="absolute inset-0 flex items-center justify-center text-[#9ca3af] font-bold">N/A</div> :
              <Chart type="bar" data={{ labels: comboData.labels, datasets: [{ type: 'line', label: 'Cumulative P&L', data: comboData.cumArr, borderColor: '#f5860a', borderWidth: 2, pointRadius: 0, yAxisID: 'y1', tension: 0.3 }, { type: 'bar', label: 'Daily P&L', data: comboData.dailyArr, backgroundColor: comboData.dailyArr.map(v => v >= 0 ? '#16a34a' : '#dc2626'), borderRadius: 4, yAxisID: 'y' }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { type: 'linear', position: 'left' }, y1: { type: 'linear', position: 'right', display: false } } }} />
            }
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm xl:w-[30%] flex flex-col items-center">
          <h3 className="text-xs font-bold text-[#9ca3af] uppercase">Avg Win/Loss Ratio</h3>
          <div className="text-4xl font-bold text-[#111827] mt-2 mb-6">{stats.winLossRatio.toFixed(2)}</div>
          <div className="flex gap-6 flex-1 w-full justify-center">
            <div className="relative w-28 h-28"><Doughnut data={{ datasets: [{ data: [75, 25], backgroundColor: ['#16a34a', '#f3f4f6'], borderWidth: 0, cutout: '80%' }] }} options={{ maintainAspectRatio: false }} /><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[#16a34a] font-bold text-sm">{formatCurrency(stats.avgWin)}</span><span className="text-[10px] text-[#9ca3af] font-bold uppercase">Avg Win</span></div></div>
            <div className="relative w-28 h-28"><Doughnut data={{ datasets: [{ data: [75, 25], backgroundColor: ['#dc2626', '#f3f4f6'], borderWidth: 0, cutout: '80%' }] }} options={{ maintainAspectRatio: false }} /><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[#dc2626] font-bold text-sm">{formatCurrency(stats.avgLoss)}</span><span className="text-[10px] text-[#9ca3af] font-bold uppercase">Avg Loss</span></div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm xl:w-[30%] flex flex-col">
          <h3 className="text-xs font-bold text-[#9ca3af] uppercase">Journal Score</h3>
          <div className="flex-1 min-h-[180px] -mt-2"><Radar data={{ labels: ['Win %', 'PF', 'W/L', 'Consist', 'Rules'], datasets: [{ data: radarMetrics.data, backgroundColor: 'rgba(245,134,10,0.15)', borderColor: '#f5860a', borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false, max: 100 } } }, plugins: { legend: { display: false } } }} /></div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-gray-500">Your Score</span><span className="text-3xl font-bold">{radarMetrics.score}</span></div>
            <div className="w-full h-2 bg-gray-100 rounded-full relative"><div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#f5860a] rounded-full shadow-sm" style={{ left: `calc(${radarMetrics.score}% - 7px)` }} /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">{dashboardDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-2"><button onClick={() => setDashboardDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronLeft className="w-5 h-5"/></button><button onClick={() => setDashboardDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronRight className="w-5 h-5"/></button></div>
        </div>
        <div className="flex flex-col bg-gray-50">
          <div className="grid grid-cols-8 gap-px border-b border-gray-100 bg-white">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase">{d}</div>)}
            <div className="py-3 text-center text-xs font-bold text-orange-500 uppercase bg-orange-50/50">Summary</div>
          </div>
          <div className="flex flex-col gap-px bg-gray-100/50">
            {calendarData.map((week, idx) => {
              const wStats = week.filter(d => d && d.stats).map(d => d.stats);
              const totalPnL = wStats.reduce((s, d) => s + d.pnl, 0), daysTraded = wStats.length;
              const winPct = wStats.reduce((s,d)=>s+d.count,0) > 0 ? wStats.reduce((s,d)=>s+d.wins,0) / wStats.reduce((s,d)=>s+d.count,0) : 0;
              return (
                <div key={idx} className="grid grid-cols-8 gap-px min-h-[100px]">
                  {week.map((d, i) => (
                    <div key={i} onClick={() => d?.stats && onDayClick(d.dateStr, d.stats.trades)} className={`bg-white p-3 flex flex-col relative ${d?.stats ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                      {d && <><span className="text-sm font-bold text-gray-500">{d.day}</span>
                      {d.stats && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className={`text-[15px] font-bold ${d.stats.pnl>=0?'text-green-600':'text-red-600'}`}>{d.stats.pnl>0?'+':''}{formatCurrency(d.stats.pnl)}</span></div>}</>}
                    </div>
                  ))}
                  <div className="bg-orange-50/20 p-3 flex flex-col justify-center items-center gap-1 border-l-2 border-orange-500/20">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Week {idx+1}</span>
                    <span className={`text-sm font-bold ${totalPnL>=0?'text-green-600':'text-red-600'}`}>{totalPnL>0?'+':''}{formatCurrency(totalPnL)}</span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-gray-500"><span>{formatPercent(winPct)} Win</span><span>•</span><span>{daysTraded} Days</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeLogView({ trades, onEdit }) {
  const calcScore = (t) => (t.rulesFollowed ? 30 : 0) + (t.tags?.length ? 30 : 0) + (t.pnl > 0 ? 40 : 0);
  const stats = useMemo(() => {
    const wins = trades.filter(t => t.pnl > 0), losses = trades.filter(t => t.pnl < 0);
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0), grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    return { 
      net: trades.reduce((s,t) => s + t.pnl, 0), pf: grossLoss ? grossProfit/grossLoss : (grossProfit ? 99 : 0), 
      winRate: trades.length ? wins.length/trades.length : 0, avgW: wins.length ? grossProfit/wins.length : 0, avgL: losses.length ? grossLoss/losses.length : 0,
      w: wins.length, l: losses.length, be: trades.length - wins.length - losses.length
    }
  }, [trades]);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase">Net cumulative P&L</div><div className={`text-3xl font-bold mt-2 ${stats.net>=0?'text-green-600':'text-red-600'}`}>{formatCurrency(stats.net)}</div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase">Profit Factor</div><div className="text-3xl font-bold mt-2">{stats.pf.toFixed(2)}</div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between"><div className="text-xs font-bold text-gray-400 uppercase">Trade Win %</div><div className="flex justify-between mt-2"><div className="text-3xl font-bold">{formatPercent(stats.winRate)}</div><div className="flex gap-1"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{stats.w} W</span><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{stats.be} BE</span><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{stats.l} L</span></div></div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase">Avg Win/Loss Trade</div><div className="text-3xl font-bold mt-2">{formatCurrency(stats.avgW)} / {formatCurrency(stats.avgL)}</div></div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b text-gray-400 text-xs uppercase tracking-wide">
              <tr>{['Open Date', 'Net P&L', 'Symbol', 'Status', 'Close Date', 'Entry Price', 'Exit Price', 'Net ROI', 'Strategy', 'Rules Followed', 'Journal Score'].map(h => <th key={h} className="px-6 py-4 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trades.map(t => (
                <tr key={t.id} onClick={() => onEdit(t)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-gray-500">{formatDate(t.entryDate)}</td>
                  <td className={`px-6 py-4 font-bold ${t.pnl>=0?'text-green-600':'text-red-600'}`}>{t.pnl>0?'+':''}{formatCurrency(t.pnl)}</td>
                  <td className="px-6 py-4 font-bold">{t.symbol}</td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${t.pnl>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{t.pnl>=0?'Win':'Loss'}</span></td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(t.exitDate)}</td>
                  <td className="px-6 py-4 text-right">${t.entryPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">${t.exitPrice.toFixed(2)}</td>
                  <td className={`px-6 py-4 text-right font-bold ${t.pnl>=0?'text-green-600':'text-red-600'}`}>{formatPercent(t.pnl / (t.entryPrice * t.quantity))}</td>
                  <td className="px-6 py-4"><div className="flex gap-1">{t.tags?.map(tag => <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{tag}</span>)}</div></td>
                  <td className="px-6 py-4">{t.rulesFollowed ? '✅' : '❌'}</td>
                  <td className="px-6 py-4 font-bold text-center">{calcScore(t)}</td>
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
  const dStats = useMemo(() => {
     let gp=0, gl=0, w=0, l=0;
     trades.forEach(t=>{if(t.pnl>0){gp+=t.pnl;w++;}else{gl+=Math.abs(t.pnl);l++;}});
     return { net: trades.reduce((s,t)=>s+t.pnl,0), winPct: w/(w+l||1), pf: gl?gp/gl:99, ev: (w/(w+l||1)*(w?gp/w:0)) - (l/(w+l||1)*(l?gl/l:0)) }
  }, [trades]);

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
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Win %</div><div className="text-xl font-bold">{formatPercent(dStats.winPct)}</div></div>
               <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Profit Factor</div><div className="text-xl font-bold">{dStats.pf.toFixed(2)}</div></div>
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
  const dStr = dashboardDate.toISOString().split('T')[0];
  const tToday = trades.filter(t => t.exitDate.startsWith(dStr));
  if(!tToday.length) return <div className="text-center py-20 text-gray-400 font-bold">No trades found for the selected date range.</div>;
  return (
    <div className="max-w-[1000px] mx-auto space-y-4">
      <h2 className="text-xl font-bold mb-6">Trades on {formatDate(dashboardDate)}</h2>
      {tToday.map(t => (
        <div key={t.id} onClick={() => onEdit(t)} className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer hover:border-orange-200 border border-transparent transition-colors">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-500">{t.symbol.substring(0,2)}</div>
              <div><div className="font-bold text-lg">{t.symbol}</div><div className="text-xs font-bold text-gray-400">{t.side} @ ${t.entryPrice} ➔ ${t.exitPrice}</div></div>
           </div>
           <div className={`text-2xl font-bold ${t.pnl>=0?'text-green-600':'text-red-600'}`}>{t.pnl>0?'+':''}{formatCurrency(t.pnl)}</div>
        </div>
      ))}
    </div>
  );
}

function ProgressView({ trades }) {
  const grid = Array.from({length: 7}, () => Array.from({length: 30}, () => Math.random() > 0.7 ? Math.floor(Math.random()*4)+1 : 0));
  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-3 gap-5">
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">Current Streak</div><div className="text-3xl font-bold">3 Days ↗</div></div>
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">Today's Progress</div><div className="text-3xl font-bold text-gray-400">No data</div></div>
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">% Rules Followed</div><div className="text-3xl font-bold">85% ↗</div></div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm">
         <h3 className="text-sm font-bold mb-6">Trading Activity</h3>
         <div className="overflow-x-auto pb-4">
           <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
             {grid.map((row, i) => row.map((cell, j) => (
                <div key={`${i}-${j}`} className={`w-4 h-4 rounded-sm ${cell===0?'bg-gray-100':cell===1?'bg-green-200':cell===2?'bg-green-400':cell===3?'bg-green-600':'bg-green-800'}`}></div>
             )))}
           </div>
         </div>
         <div className="flex gap-2 items-center text-xs text-gray-400 font-bold mt-4">Less <div className="flex gap-1"><div className="w-3 h-3 bg-gray-100"></div><div className="w-3 h-3 bg-green-200"></div><div className="w-3 h-3 bg-green-400"></div><div className="w-3 h-3 bg-green-600"></div><div className="w-3 h-3 bg-green-800"></div></div> More</div>
      </div>
      <div className="grid grid-cols-2 gap-5">
         <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold">Daily Checklist</h3><button className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1 rounded-lg">View Day</button></div>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Manual Rules</h4>
            <div className="text-sm text-gray-400 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">No rules yet. Add rules to get started.</div>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Automatic Rules</h4>
            <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100">No automated rule data yet for today.</div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold">Current Rules</h3><button className="border border-gray-200 text-gray-600 font-bold text-sm px-3 py-1 rounded-lg">Edit Rules</button></div>
            <div className="flex items-center justify-center h-40 text-gray-400 font-bold text-sm border-2 border-dashed border-gray-100 rounded-xl">No active rules.</div>
         </div>
      </div>
    </div>
  );
}

function StrategyView({ trades, strategies, setStrategies }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const saveNewStrategy = () => {
    if (newName.trim()) {
      setStrategies([...strategies, { id: generateId(), name: newName.trim() }]);
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-4 gap-5">
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">Best Performing</div><div className="text-xl font-bold">No data</div></div>
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">Least Performing</div><div className="text-xl font-bold">No data</div></div>
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">Best Winrate</div><div className="text-xl font-bold">No data</div></div>
         <div className="bg-white p-6 rounded-2xl shadow-sm"><div className="text-xs font-bold text-gray-400 uppercase mb-2">Most Active</div><div className="text-xl font-bold">No data</div></div>
      </div>
      <div className="flex justify-end">
        {isAdding ? (
          <div className="flex gap-2">
            <input type="text" autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewStrategy()} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none" placeholder="Strategy Name" />
            <button onClick={saveNewStrategy} className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl text-sm shadow-sm">Save</button>
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl text-sm shadow-sm">+ Create New Strategy</button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-5">
         {strategies.map(s => {
            const sTrades = trades.filter(t => t.tags?.includes(s.name));
            const w = sTrades.filter(t => t.pnl > 0).length;
            const wr = sTrades.length ? w/sTrades.length : 0;
            return (
              <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                 <h3 className="font-bold text-lg">{s.name}</h3>
                 <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Trades</span><span className="font-bold">{sTrades.length}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-gray-500 font-bold">Win Rate</span><span className="font-bold">{formatPercent(wr)}</span></div>
              </div>
            )
         })}
      </div>
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
  const [started, setStarted] = useState(false);
  return (
    <div className="h-[calc(100vh-140px)] w-full bg-gradient-to-br from-[#e0e7ff] to-[#f3e8ff] flex items-center justify-center rounded-3xl shadow-inner max-w-[1500px] mx-auto overflow-hidden relative">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
      <div className="bg-white/80 backdrop-blur-xl p-16 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(107,33,168,0.1)] text-center flex flex-col items-center relative z-10 w-[500px] border border-white">
         <div className="text-purple-600 font-bold text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Wind size={16}/> Zen Mode</div>
         <h2 className="text-4xl font-bold text-gray-900 mb-10 leading-tight">15 minute guided meditation</h2>
         <button onClick={() => setStarted(true)} className="w-full py-4 bg-[#f3e8ff] text-purple-700 font-bold rounded-2xl hover:bg-purple-200 transition-colors shadow-sm text-lg">
           {started ? "14:59..." : "Start Now"}
         </button>
      </div>
    </div>
  );
}

// --- MODALS ---

function StartDayModal({ onClose, trades }) {
  const todayPnL = useMemo(() => trades.filter(t=>t.exitDate.startsWith(new Date().toISOString().split('T')[0])).reduce((s,t)=>s+t.pnl,0), [trades]);
  return (
    <div className="fixed inset-0 z-50 bg-[#f7f7f8] flex flex-col">
      <header className="h-20 px-8 flex justify-between items-center bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-2xl font-bold">Start Your Day</h1>
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
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-[#111827]">My Trading Accounts</h2>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600 text-sm hover:bg-gray-50 shadow-sm transition-colors">Sync</button>
            <button className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl font-bold text-sm shadow-sm shadow-[#16a34a]/20 transition-colors">+ Add New Account</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-800 ml-2 p-1"><X size={20}/></button>
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
  const isEdit = !!trade;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formData, setFormData] = useState(trade || {
    symbol: '', side: 'Long', entryPrice: '', exitPrice: '', quantity: '', 
    entryDate: getInputDate(new Date()), exitDate: getInputDate(new Date()), fees: '0', notes: '', tags: []
  });
  const pnlPreview = useMemo(() => calcPnL(formData.side, parseFloat(formData.entryPrice), parseFloat(formData.exitPrice), parseFloat(formData.quantity), parseFloat(formData.fees)), [formData]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: trade ? trade.id : generateId(), ...formData,
      entryPrice: parseFloat(formData.entryPrice) || 0, exitPrice: parseFloat(formData.exitPrice) || 0,
      quantity: parseFloat(formData.quantity) || 0, fees: parseFloat(formData.fees || 0),
      symbol: formData.symbol.toUpperCase(), pnl: pnlPreview, rulesFollowed: true
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#111827]/20 backdrop-blur-sm p-4">
      <div className="bg-[#ffffff] rounded-3xl w-full max-w-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-bold text-[#111827]">{isEdit ? 'Edit Trade' : 'Log New Trade'}</h2>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#111827] bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 pb-4">
          <form id="trade-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">Symbol</label>
                <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-2.5 text-[#111827] font-bold uppercase focus:ring-1 focus:ring-[#f5860a] focus:outline-none" required />
              </div>
              <div>
                 <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">Side</label>
                 <select name="side" value={formData.side} onChange={handleChange} className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-1 focus:ring-[#f5860a] focus:outline-none">
                    <option>Long</option><option>Short</option>
                 </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">Entry</label>
                <input type="number" step="any" name="entryPrice" value={formData.entryPrice} onChange={handleChange} className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-1 focus:ring-[#f5860a] focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">Exit</label>
                <input type="number" step="any" name="exitPrice" value={formData.exitPrice} onChange={handleChange} className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-1 focus:ring-[#f5860a] focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9ca3af] uppercase mb-2">Qty</label>
                <input type="number" step="any" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-1 focus:ring-[#f5860a] focus:outline-none" required />
              </div>
            </div>
          </form>
        </div>
        <div className="bg-gray-50 border-t border-[rgba(0,0,0,0.06)] p-6 px-8 flex justify-between items-center">
           <div>
              <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">Preview P&L</div>
              <div className={`text-xl font-bold ${pnlPreview >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>{pnlPreview >= 0 ? '+' : ''}{formatCurrency(pnlPreview)}</div>
           </div>
           <div className="flex gap-3">
             {isEdit && (
               confirmDelete ? (
                 <button type="button" onClick={() => onDelete(trade.id)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold transition-colors">Yes, Delete</button>
               ) : (
                 <button type="button" onClick={() => setConfirmDelete(true)} className="px-6 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl font-bold transition-colors">Delete</button>
               )
             )}
             <button type="submit" form="trade-form" className="px-6 py-3 bg-[#f5860a] hover:bg-[#e07909] text-white rounded-xl font-bold shadow-md shadow-[#f5860a]/20 transition-colors">Save Trade</button>
           </div>
        </div>
      </div>
    </div>
  );
}

function DayTradesModal({ date, trades, onClose, onEdit }) {
  if (!date) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/20 backdrop-blur-sm p-4">
      <div className="bg-[#ffffff] rounded-3xl w-full max-w-lg shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="flex justify-between p-6 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-bold text-[#111827]">Trades on {formatDate(date)}</h2>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#111827]"><X className="w-5 h-5" /></button>
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