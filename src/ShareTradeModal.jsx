import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Copy, Share2, EyeOff, Upload, FileText, RefreshCw } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

export default function ShareTradeModal({ trade, onClose }) {
  const [format, setFormat] = useState('portrait'); // 'portrait' | 'landscape'
  const [blurPnL, setBlurPnL] = useState(false);
  const [hideDetails, setHideDetails] = useState(false);
  const [traderName, setTraderName] = useState('ICT_Alex');
  const [customAttachments, setCustomAttachments] = useState([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(null);
  
  // Crop / zoom controls
  const [fitMode, setFitMode] = useState('cover'); // 'cover' | 'contain'
  const [zoomScale, setZoomScale] = useState(1); // 1 to 2
  const [offsetY, setOffsetY] = useState(0); // -150 to 150
  
  const [previewScale, setPreviewScale] = useState(0.3);
  const [isActionGenerating, setIsActionGenerating] = useState(false);
  
  const containerRef = useRef(null);
  const exportCertRef = useRef(null);

  const tradeAttachments = [...(trade.attachments || []), ...customAttachments];
  const selectedAttachment = tradeAttachments.find(a => a.id === selectedAttachmentId);

  // Auto scale preview to fit container responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        const targetWidth = format === 'portrait' ? 1080 : 1200;
        const targetHeight = format === 'portrait' ? 1350 : 675;
        const scaleW = width / targetWidth;
        const scaleH = height / targetHeight;
        setPreviewScale(Math.min(scaleW, scaleH) * 0.95);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [format]);

  const generatePngImage = async () => {
    if (!exportCertRef.current) return null;
    setIsActionGenerating(true);
    try {
      // Small delay to let browser flush state updates to export node
      await new Promise(resolve => setTimeout(resolve, 150));
      const dataUrl = await toPng(exportCertRef.current, {
        cacheBust: true,
        pixelRatio: 2, // 2x scale for crisp export
      });
      setIsActionGenerating(false);
      return dataUrl;
    } catch (error) {
      console.error('Error generating certificate image:', error);
      setIsActionGenerating(false);
      return null;
    }
  };

  const downloadImage = async () => {
    const url = await generatePngImage();
    if (!url) return;
    const link = document.createElement('a');
    link.download = `${trade.symbol || 'trade'}_verified_certificate.png`;
    link.href = url;
    link.click();
  };

  const copyToClipboard = async () => {
    const url = await generatePngImage();
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert('Image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy directly. Please download the certificate.');
    }
  };

  const shareImage = async () => {
    const url = await generatePngImage();
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'trade_certificate.png', { type: blob.type });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Verified Trade',
          text: `Check out my verified trade on ${trade.symbol}!`,
        });
      } else {
        copyToClipboard();
      }
    } catch (err) {
      console.error('Share error:', err);
      copyToClipboard();
    }
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

  const renderCertificateContent = () => {
    const isProfit = (trade.pnl || 0) >= 0;
    
    return (
      <div 
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          width: format === 'portrait' ? '1080px' : '1200px', 
          height: format === 'portrait' ? '1350px' : '675px',
        }}
        className="bg-[#0b0c10] border-[6px] border-white/5 flex flex-col text-gray-200 relative overflow-hidden select-none p-12 justify-between animate-none w-full h-full"
      >
        {/* Radial accent glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_75%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.04)_0%,transparent_70%)] pointer-events-none" />

        {/* Decorative Corner Borders */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-orange-500/30" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-orange-500/30" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-orange-500/30" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-orange-500/30" />

        {/* Top Branding Section */}
        <div className={`flex flex-col mt-4 ${
          selectedAttachment && format === 'landscape' ? 'items-start text-left pl-6' : 'items-center text-center'
        }`}>
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-orange-500/30 shadow-inner mb-3">
            <span className="text-orange-400 font-bold text-xl tracking-tighter">E</span>
          </div>
          <p className="text-[11px] font-semibold text-orange-500 tracking-[0.3em] uppercase font-sans">Enigmaq Portal</p>
          <h4 className="text-2xl font-bold tracking-tight text-white uppercase mt-1">Verified Trade Certificate</h4>
          <div className={`h-0.5 mt-2 ${
            selectedAttachment && format === 'landscape' 
              ? 'w-24 bg-gradient-to-r from-orange-500/50 to-transparent' 
              : 'w-16 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent'
          }`} />
        </div>

        {/* Split Layout vs Regular layout rendering */}
        {selectedAttachment && format === 'landscape' ? (
          /* Split layout for Landscape orientation with chart embedded */
          <div className="flex gap-10 items-center my-2 flex-1 overflow-hidden pl-6">
            {/* Left Column: Stats & P&L */}
            <div className="flex flex-col flex-1 justify-between h-full py-2">
              <div className="space-y-4">
                {/* Hero Performance */}
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-4xl font-bold text-white tracking-tight">{trade.symbol}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border-2 ${
                      trade.side === 'Long' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {trade.side || 'Long'}
                    </span>
                  </div>
                  
                  <div className="relative inline-block">
                    <div 
                      className={`${blurPnL ? 'blur-xl select-none' : ''} ${
                        isProfit ? 'text-green-400' : 'text-red-400'
                      }`}
                      style={{ 
                        fontSize: '54px',
                        fontVariantNumeric: 'tabular-nums', 
                        letterSpacing: '-0.02em', 
                        fontWeight: 800 
                      }}
                    >
                      {isProfit ? '+' : ''}{formatCurrency(trade.pnl)}
                    </div>
                    {blurPnL && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 ${
                          isProfit ? 'text-green-400 border-green-500/25' : 'text-red-400 border-red-500/25'
                        }`}>
                          {isProfit ? 'Verified Win' : 'Verified Loss'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact Details Grid */}
                {!hideDetails && (
                  <div className="bg-[#12141c]/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        { label: 'Entry Price', val: trade.entryPrice },
                        { label: 'Exit Price', val: trade.exitPrice },
                        { label: 'Trade Size', val: `${trade.quantity || 1} ${trade.symbol}` },
                        { label: 'Hold Time', val: calculateHoldtime(trade.entryDate, trade.entryTime, trade.exitDate, trade.exitTime) }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-white/5 last:border-b-0">
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{item.label}</span>
                          <span className="text-[11px] font-semibold text-gray-200" style={{ fontVariantNumeric: 'tabular-nums' }}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Chart Attachment */}
            <div className="w-[520px] h-[380px] border border-white/10 rounded-2xl overflow-hidden bg-[#12141c]/50 relative shrink-0">
              <img 
                src={selectedAttachment.url} 
                alt="Trade chart" 
                className="w-full h-full" 
                style={{
                  objectFit: fitMode,
                  transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
                  transformOrigin: 'center center',
                  transition: 'none'
                }}
              />
              <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                Chart Screenshot
              </div>
            </div>
          </div>
        ) : (
          /* Portrait Layout or Landscape layout without screenshot select */
          <div className="flex flex-col gap-6 flex-1 justify-center my-4">
            {/* Hero Performance Card Section */}
            <div className="flex flex-col items-center text-center my-2 justify-center shrink-0">
              {/* Symbol & Side */}
              <div className="flex items-center gap-4 mb-2">
                <span className="text-6xl font-bold text-white tracking-tight">{trade.symbol}</span>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-bold uppercase tracking-wide border-2 ${
                  trade.side === 'Long' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {trade.side || 'Long'}
                </span>
              </div>

              {/* P&L Display */}
              <div className="relative">
                <div 
                  className={`${blurPnL ? 'blur-2xl select-none' : ''} ${
                    isProfit ? 'text-green-400' : 'text-red-400'
                  }`}
                  style={{ 
                    fontSize: '84px',
                    fontVariantNumeric: 'tabular-nums', 
                    letterSpacing: '-0.02em', 
                    fontWeight: 800 
                  }}
                >
                  {isProfit ? '+' : ''}{formatCurrency(trade.pnl)}
                </div>
                {blurPnL && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold uppercase tracking-widest px-6 py-2 rounded-xl bg-white/5 border border-white/10 ${
                      isProfit ? 'text-green-400 border-green-500/25' : 'text-red-400 border-red-500/25'
                    }`}>
                      {isProfit ? 'Verified Win' : 'Verified Loss'}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags / Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300">
                  {trade.tradeType || 'Futures'}
                </span>
                {(trade.tags || []).length > 0 ? (
                  trade.tags.map((t, i) => (
                    <span key={i} className="px-3.5 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-bold">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold">
                    Verified Trade
                  </span>
                )}
              </div>
            </div>

            {/* Embedded Screenshot for Portrait orientation */}
            {selectedAttachment && format === 'portrait' && (
              <div className="mx-6 my-2 border border-white/10 rounded-2xl overflow-hidden bg-[#12141c]/50 h-[280px] flex items-center justify-center relative shrink-0">
                <img 
                  src={selectedAttachment.url} 
                  alt="Trade chart" 
                  className="w-full h-full" 
                  style={{
                    objectFit: fitMode,
                    transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
                    transformOrigin: 'center center',
                    transition: 'none'
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                  Chart Screenshot
                </div>
              </div>
            )}

            {/* Details Table / Grid */}
            {!hideDetails && (
              <div className="mx-6 bg-[#12141c]/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm shrink-0">
                <div className="grid gap-x-8 gap-y-3 grid-cols-2">
                  {[
                    { label: 'Entry Price', val: trade.entryPrice },
                    { label: 'Exit Price', val: trade.exitPrice },
                    { label: 'Stop Loss', val: trade.stopLoss || 'Not Set' },
                    { label: 'Take Profit', val: trade.profitTarget || 'Not Set' },
                    { label: 'Trade Size', val: `${trade.quantity || 1} ${trade.symbol}` },
                    { label: 'Leverage', val: '1000x' },
                    { label: 'Commissions', val: trade.fees ? `-$${trade.fees}` : '$0.00' },
                    { label: 'Hold Time', val: calculateHoldtime(trade.entryDate, trade.entryTime, trade.exitDate, trade.exitTime) }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-white/5 last:border-b-0">
                      <span 
                        className="text-[11px] font-medium text-gray-500 uppercase"
                        style={{ letterSpacing: '0.01em' }}
                      >
                        {item.label}
                      </span>
                      <span 
                        className="text-[12px] text-gray-200"
                        style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                      >
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Security Section */}
        <div className="flex justify-between items-end border-t border-white/5 pt-6 px-4 shrink-0">
          <div className="text-left space-y-1">
            <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wider">Verified Trader</p>
            <p className="text-sm font-semibold text-white tracking-wide">{traderName}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-gray-655 bg-white/5 border border-white/10 rounded px-2.5 py-1 tracking-widest font-mono select-all">
              TRD-{trade.id || 'NQA812'}
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wider">Secure Verification</p>
            <p className="text-[11px] font-normal text-gray-400 opacity-60">
              {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const isProfit = (trade.pnl || 0) >= 0;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm">Share Trade Certificate</h3>
            <p className="text-[10px] text-gray-400">Generate a verified certificate of your trade performance</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row p-6 gap-6 bg-[#0a0a0a]">
          {/* Left Panel: Live Dynamic Preview (Silky 60FPS Dragging) */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center bg-black/40 rounded-xl p-4 border border-white/5 relative min-h-[350px] overflow-hidden">
            {isActionGenerating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-2">
                <RefreshCw size={24} className="text-orange-500 animate-spin" />
                <span className="text-xs text-gray-400 font-semibold">Generating high-res download file...</span>
              </div>
            )}

            <div 
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'center center',
                width: format === 'portrait' ? '1080px' : '1200px',
                height: format === 'portrait' ? '1350px' : '675px',
              }}
              className="shrink-0 transition-transform duration-100 ease-out"
            >
              {renderCertificateContent()}
            </div>
          </div>

          {/* Right Panel: Configurations */}
          <div className="w-full md:w-[320px] flex flex-col gap-5 justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Orientation</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFormat('portrait')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${format === 'portrait' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                  >
                    Portrait (1080x1350)
                  </button>
                  <button 
                    onClick={() => setFormat('landscape')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${format === 'landscape' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                  >
                    Landscape (1200x675)
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Trader Name / Handle</span>
                <input 
                  type="text" 
                  value={traderName} 
                  onChange={e => setTraderName(e.target.value)} 
                  placeholder="e.g. ICT_Alex"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              {/* Chart Attachment Selector */}
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Include Chart Screenshot</span>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <button 
                      onClick={() => setSelectedAttachmentId(null)}
                      className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${!selectedAttachmentId ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <EyeOff size={14} />
                      <span className="text-[8px] font-bold">None</span>
                    </button>
                    {tradeAttachments.map(att => (
                      <button 
                        key={att.id}
                        onClick={() => setSelectedAttachmentId(att.id)}
                        className={`aspect-square rounded-lg border overflow-hidden relative transition-all ${selectedAttachmentId === att.id ? 'border-orange-500 ring-1 ring-orange-500' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                      >
                        {att.type?.startsWith('image/') ? (
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-4 h-4 mx-auto text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  <label className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-semibold text-gray-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-white/5">
                    <Upload size={12} /> Upload Screenshot
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const newAtt = {
                              id: 'custom-' + Date.now(),
                              name: file.name,
                              type: file.type,
                              url: reader.result
                            };
                            setCustomAttachments(prev => [...prev, newAtt]);
                            setSelectedAttachmentId(newAtt.id);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="hidden" 
                      accept="image/*" 
                    />
                  </label>
                </div>
              </div>

              {/* Crop / Zoom Controls */}
              {selectedAttachment && (
                <div className="space-y-3 bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest block">Screenshot Alignment</span>
                  
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Fit Mode</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setFitMode('cover')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded border ${fitMode === 'cover' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                      >
                        Fill & Crop
                      </button>
                      <button 
                        onClick={() => setFitMode('contain')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded border ${fitMode === 'contain' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                      >
                        Fit Entire
                      </button>
                    </div>
                  </div>

                  {fitMode === 'cover' && (
                    <>
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-gray-400">Zoom / Crop</span>
                          <span className="text-gray-200">{Math.round(zoomScale * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="2" 
                          step="0.05"
                          value={zoomScale} 
                          onChange={e => setZoomScale(parseFloat(e.target.value))}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-gray-400">Vertical Offset</span>
                          <span className="text-gray-200">{offsetY}px</span>
                        </div>
                        <input 
                          type="range" 
                          min="-150" 
                          max="150" 
                          step="5"
                          value={offsetY} 
                          onChange={e => setOffsetY(parseInt(e.target.value))}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Privacy Filters</span>
                
                <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all select-none">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">Blur Net P&L</span>
                    <span className="text-[9px] text-gray-400">Blurs exact profit/loss amount</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={blurPnL} 
                    onChange={e => setBlurPnL(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-500 border-white/20 bg-transparent cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all select-none">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200">Hide Trade Details</span>
                    <span className="text-[9px] text-gray-400">Hides full metrics grid table</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={hideDetails} 
                    onChange={e => setHideDetails(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-500 border-white/20 bg-transparent cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <button 
                onClick={downloadImage} 
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/10"
              >
                <Download size={14} /> Download Certificate (PNG)
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy size={13} /> Copy Image
                </button>
                <button 
                  onClick={shareImage}
                  className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 size={13} /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Certificate Generator Container (used strictly for generating the clean unscaled export PNG file) */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div ref={exportCertRef}>
          {renderCertificateContent()}
        </div>
      </div>
    </div>
  );
}
