import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { QrReader } from 'react-qr-reader';
import { 
  ArrowLeft, Download, Ticket, Users, CheckCircle, 
  Loader2, RefreshCw, Server, Edit2, Save, X, 
  Search, Copy, Check, XCircle, FolderOpen, 
  Camera, Scan 
} from 'lucide-react';

interface EventStats {
  id: string;
  name: string;
  totalCapacity: number;
  totalGenerated: number;
  totalCheckedIn: number;
}

interface Token {
  tokenId: string;
  guestName: string | null;
  batchName?: string | null; // camelCase (Standard)
  BatchName?: string | null; // PascalCase (C# Fallback)
  checkedIn: boolean;
}

export default function EventDetailsScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<EventStats | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Action States
  const [generateCount, setGenerateCount] = useState('');
  const [generateBatchName, setGenerateBatchName] = useState('');
  const [generating, setGenerating] = useState(false);
  
  const [downloading, setDownloading] = useState(false);
  const [selectedDownloadBatch, setSelectedDownloadBatch] = useState<string>('ALL');

  // Inline Editing States
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // UX States
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ type: 'idle' | 'success' | 'warning' | 'error', message: string }>({ type: 'idle', message: '' });
  
  // Use a ref to prevent auto-refresh from overwriting while admin is typing a name
  const isEditingRef = useRef(false);
  isEditingRef.current = editingTokenId !== null;

  const processingScanRef = useRef(false);

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [statsRes, tokensRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/tokens`)
      ]);
      setEvent(statsRes.data);
      
      // Only update tokens if the admin isn't actively editing a row
      if (!isEditingRef.current) {
        // DEFENSIVE FIX: Guarantee this is an array before setting it in state
        setTokens(Array.isArray(tokensRes.data) ? tokensRes.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch event data", error);
    } finally {
      if (isManualRefresh) setRefreshing(false);
      setLoading(false);
    }
  };

  // LIVE AUTO-UPDATE ENGINE (Polls every 10 seconds)
  useEffect(() => {
    fetchData(); // Initial load
    
    const interval = setInterval(() => {
      fetchData(false); // Silent background fetch
    }, 10000); 

    return () => clearInterval(interval);
  }, [id]);

  // Extract unique batch names (Defensively checking both casing types)
  const uniqueBatches = useMemo(() => {
    // DEFENSIVE FIX: Double check tokens is an array before map
    const safeTokens = Array.isArray(tokens) ? tokens : [];
    const batches = new Set(
      safeTokens
        .map(t => t.batchName || t.BatchName)
        .filter(Boolean) as string[]
    );
    return Array.from(batches);
  }, [tokens]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(generateCount);
    if (!count || count <= 0) return;

    setGenerating(true);
    try {
      await api.post(`/events/${id}/generate`, { 
        count,
        batchName: generateBatchName.trim() || null,
        BatchName: generateBatchName.trim() || null // Send both to be absolutely safe
      });
      setGenerateCount('');
      setGenerateBatchName('');
      await fetchData(true); 
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate tokens. Check capacity limits.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Build the URL depending on if a batch is selected
      const query = selectedDownloadBatch !== 'ALL' 
        ? `?batch=${encodeURIComponent(selectedDownloadBatch)}` 
        : '';
        
      const response = await api.get(`/events/${id}/download-tickets${query}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileNameSuffix = selectedDownloadBatch !== 'ALL' ? `_${selectedDownloadBatch}` : '_Complete';
      link.setAttribute('download', `${event?.name?.replace(/\s+/g, '_')}${fileNameSuffix}_Cards.zip`);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download ZIP.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveName = async (tokenId: string) => {
    setSavingName(true);
    try {
      await api.put(`/events/${id}/tokens/${tokenId}`, { guestName: editNameValue });
      const safeTokens = Array.isArray(tokens) ? tokens : [];
      setTokens(safeTokens.map(t => t.tokenId === tokenId ? { ...t, guestName: editNameValue } : t));
      setEditingTokenId(null);
    } catch (error) {
      console.error("Failed to update name", error);
      alert("Error saving guest name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleCopy = (tokenId: string) => {
    navigator.clipboard.writeText(tokenId);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScanResult = async (result: any, error: any) => {
    if (result?.text && !processingScanRef.current) {
      processingScanRef.current = true;
      const scannedTokenId = result.text;
      
      setScanStatus({ type: 'idle', message: `Processing Code: ${scannedTokenId}...` });

      try {
        const payload = [{
          tokenId: scannedTokenId,
          scannedAt: new Date().toISOString()
        }];

        // Hitting your existing C# sync endpoint
        const response = await api.post(`/events/${id}/sync`, payload);
        const data = response.data;

        if (data.successfullyCheckedIn === 1 || data.SuccessfullyCheckedIn === 1) {
          setScanStatus({ type: 'success', message: `ACCESS GRANTED: ${scannedTokenId} Checked In.` });
          await fetchData(false); 
        } else if (data.alreadyCheckedIn === 1 || data.AlreadyCheckedIn === 1) {
          setScanStatus({ type: 'warning', message: `WARNING: Code ${scannedTokenId} was already used.` });
        } else {
          setScanStatus({ type: 'error', message: `DENIED: Code ${scannedTokenId} is invalid for this event.` });
        }
      } catch (err) {
        console.error("Check-in failed", err);
        setScanStatus({ type: 'error', message: 'Network Error during validation.' });
      } finally {
        // Cooldown before next scan is allowed
        setTimeout(() => {
          processingScanRef.current = false;
          setScanStatus(prev => prev.message.includes(scannedTokenId) ? { type: 'idle', message: '' } : prev);
        }, 3000);
      }
    }
  };

  // DEFENSIVE FIX: Ensure tokens is array before filter
  const safeTokensList = Array.isArray(tokens) ? tokens : [];
  const filteredTokens = safeTokensList.filter(token => {
    const query = searchQuery.toLowerCase();
    const folderName = token.batchName || token.BatchName || '';
    
    const matchesId = token.tokenId.toLowerCase().includes(query);
    const matchesName = token.guestName?.toLowerCase().includes(query) || false;
    const matchesBatch = folderName.toLowerCase().includes(query) || false;
    
    return matchesId || matchesName || matchesBatch;
  });

  if (loading || !event) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-gray-400">
        <div className="relative mb-6">
          <div className="absolute inset-0 border-t-2 border-emberz-cyan rounded-full animate-spin blur-[2px]" />
          <Loader2 className="animate-spin text-emberz-cyan relative z-10" size={48} />
        </div>
        <p className="uppercase tracking-[0.3em] text-xs font-semibold text-emberz-cyan/80">Connecting to Secure Node</p>
      </div>
    );
  }

  const generationProgress = Math.min((event.totalGenerated / event.totalCapacity) * 100, 100);
  const checkInProgress = event.totalGenerated > 0 ? Math.min((event.totalCheckedIn / event.totalGenerated) * 100, 100) : 0;

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      
      {/* Top Header Actions */}
      <div className="flex items-center justify-between mb-10">
        <button 
          onClick={() => navigate('/')}
          className="group flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 px-4 py-2 rounded-full text-gray-400 hover:text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="uppercase text-[0.65rem] tracking-widest font-bold">Return to Network</span>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[0.6rem] text-gray-400 uppercase tracking-widest font-bold">Live Sync Active</span>
          </div>
          <button 
            onClick={() => fetchData(true)}
            className={`p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-emberz-cyan/30 rounded-full text-gray-400 hover:text-emberz-cyan transition-all backdrop-blur-md ${refreshing ? 'animate-spin border-emberz-cyan text-emberz-cyan' : ''}`}
            title="Force Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Main Title Area */}
      <div className="mb-12 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emberz-pink/10 to-transparent border border-emberz-pink/20 mb-6 shadow-[0_0_20px_rgba(255,0,85,0.05)]">
          <Server size={14} className="text-emberz-pink" />
          <span className="text-[0.65rem] font-mono text-emberz-pink/90 uppercase tracking-[0.2em] font-bold">
            NODE_ID: {event.id.split('-')[0]}
          </span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 tracking-tighter uppercase drop-shadow-2xl">
          {event.name}
        </h1>
      </div>

      {/* Live Telemetry (Stats Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="group relative bg-gradient-to-br from-white/[0.04] to-black/60 border border-white/10 hover:border-blue-400/30 rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 overflow-hidden">
          <div className="flex items-center gap-3 text-gray-400 mb-4 relative z-10">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Users size={18} className="text-blue-400" />
            </div>
            <span className="uppercase tracking-[0.2em] text-[0.65rem] font-bold text-gray-300">Maximum Capacity</span>
          </div>
          <div className="text-5xl font-mono text-white relative z-10 font-light tracking-tight">{event.totalCapacity.toLocaleString()}</div>
        </div>

        <div className="group relative bg-gradient-to-br from-white/[0.04] to-black/60 border border-white/10 hover:border-emberz-cyan/30 rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 overflow-hidden">
          <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
            <div className="h-full bg-emberz-cyan transition-all duration-1000 shadow-[0_0_15px_#00FFCC]" style={{ width: `${generationProgress}%` }} />
          </div>
          <div className="flex items-center gap-3 text-gray-400 mb-4 relative z-10">
            <div className="p-2 bg-emberz-cyan/10 rounded-lg border border-emberz-cyan/20">
              <Ticket size={18} className="text-emberz-cyan" />
            </div>
            <span className="uppercase tracking-[0.2em] text-[0.65rem] font-bold text-gray-300">Tokens Generated</span>
          </div>
          <div className="text-5xl font-mono text-white relative z-10 font-light tracking-tight">{event.totalGenerated.toLocaleString()}</div>
        </div>

        <div className="group relative bg-gradient-to-br from-white/[0.04] to-black/60 border border-white/10 hover:border-emberz-pink/30 rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 overflow-hidden">
          <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
            <div className="h-full bg-emberz-pink transition-all duration-1000 shadow-[0_0_15px_#FF0055]" style={{ width: `${checkInProgress}%` }} />
          </div>
          <div className="flex items-center gap-3 text-gray-400 mb-4 relative z-10">
            <div className="p-2 bg-emberz-pink/10 rounded-lg border border-emberz-pink/20">
              <CheckCircle size={18} className="text-emberz-pink" />
            </div>
            <span className="uppercase tracking-[0.2em] text-[0.65rem] font-bold text-gray-300">Live Check-ins</span>
          </div>
          <div className="text-5xl font-mono text-white relative z-10 font-light tracking-tight">{event.totalCheckedIn.toLocaleString()}</div>
        </div>
      </div>

      {/* Control Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Generate Panel */}
        <div className="relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl overflow-hidden group">
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Initialize Tokens</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">Generate new access codes. Assign them to a folder/batch for easier distribution.</p>
          
          <form onSubmit={handleGenerate} className="flex flex-col gap-4 relative z-10">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number" min="1" max={event.totalCapacity - event.totalGenerated} required
                value={generateCount} onChange={(e) => setGenerateCount(e.target.value)}
                className="w-full sm:w-1/3 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white font-mono focus:outline-none focus:border-emberz-cyan/50 focus:ring-1 focus:ring-emberz-cyan/50 transition-all placeholder-gray-600"
                placeholder="Qty (e.g. 50)" disabled={event.totalGenerated >= event.totalCapacity}
              />
              <input
                type="text" 
                value={generateBatchName} onChange={(e) => setGenerateBatchName(e.target.value)}
                className="w-full sm:w-2/3 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-emberz-cyan/50 focus:ring-1 focus:ring-emberz-cyan/50 transition-all placeholder-gray-600"
                placeholder="Folder Name (e.g. VIP List A)" disabled={event.totalGenerated >= event.totalCapacity}
              />
            </div>
            <button
              type="submit" disabled={generating || event.totalGenerated >= event.totalCapacity}
              className="w-full flex items-center justify-center gap-3 bg-emberz-cyan text-black font-bold py-4 px-8 rounded-2xl hover:bg-teal-300 transition-all shadow-[0_0_20px_rgba(0,255,204,0.2)] hover:shadow-[0_0_30px_rgba(0,255,204,0.4)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generating ? <Loader2 className="animate-spin" size={20} /> : <Ticket size={20} />}
              Generate to Node
            </button>
          </form>
        </div>

        {/* Download Panel */}
        <div className="relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl overflow-hidden group flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Export Access Cards</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">Download a ZIP archive of digital cards. Select a specific folder to download only those tickets.</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="relative">
              <FolderOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <select 
                value={selectedDownloadBatch}
                onChange={(e) => setSelectedDownloadBatch(e.target.value)}
                className="w-full appearance-none bg-black/40 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-white text-sm focus:outline-none focus:border-white/30 transition-all cursor-pointer"
              >
                {/* Added bg-gray-900 to options so they don't turn invisible on white-theme OS dropdowns */}
                <option value="ALL" className="bg-gray-900 text-white">Download Entire Event (All Folders)</option>
                {uniqueBatches.map(batch => (
                  <option key={batch} value={batch} className="bg-gray-900 text-white">Folder: {batch}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDownload} disabled={downloading || event.totalGenerated === 0}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-8 rounded-2xl hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader2 className="animate-spin text-black" size={20} /> : <Download size={20} />}
              {downloading ? 'Packing Artifacts...' : 'Download (.ZIP)'}
            </button>
          </div>
        </div>

        {/* Live Scanner Panel */}
        <div className="relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-emberz-pink/20 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_30px_rgba(255,0,85,0.05)] overflow-hidden group flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Camera className="text-emberz-pink" size={24} />
              <h3 className="text-xl font-bold text-white tracking-tight">Live Web Scanner</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">Turn this device into a secure check-in node. Scan Gigat Cards using your camera.</p>
          </div>
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full flex items-center justify-center gap-3 bg-emberz-pink text-white font-bold py-4 px-8 rounded-2xl hover:bg-rose-500 transition-all shadow-[0_0_20px_rgba(255,0,85,0.2)] hover:shadow-[0_0_40px_rgba(255,0,85,0.5)]"
            >
              <Scan size={20} />
              Launch Scanner
            </button>
          </div>
        </div>
      </div>

      {/* Guest Registry / Token Management */}
      <div className="bg-gradient-to-b from-white/[0.03] to-black/80 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col h-[650px]">
        {/* Registry Header */}
        <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shrink-0 bg-white/[0.01]">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Guest Registry</h3>
            <p className="text-gray-400 text-sm mt-1">Manage network assignments for {safeTokensList.length} generated tokens.</p>
          </div>
          
          <div className="relative w-full sm:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-gray-500 group-focus-within:text-emberz-cyan transition-colors" size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-sm text-white focus:outline-none focus:border-emberz-cyan/50 focus:ring-1 focus:ring-emberz-cyan/50 transition-all placeholder-gray-600 shadow-inner"
              placeholder="Query PIN, Name, or Folder..."
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Scrollable Table Area */}
        <div className="overflow-x-auto flex-grow overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 shadow-sm">
              <tr className="text-[0.65rem] uppercase tracking-[0.2em] font-bold text-gray-500">
                <th className="px-8 py-5 whitespace-nowrap">Token ID (PIN)</th>
                <th className="px-8 py-5 whitespace-nowrap">Folder / Batch</th>
                <th className="px-8 py-5 whitespace-nowrap">Guest Name</th>
                <th className="px-8 py-5 whitespace-nowrap">Status</th>
                <th className="px-8 py-5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {safeTokensList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Ticket size={48} className="mb-4" />
                      <p className="italic text-sm">No tokens generated yet. Initialize tokens above to begin.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Search size={48} className="mb-4" />
                      <p className="italic text-sm">No tokens found matching "{searchQuery}".</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTokens.map((token) => {
                  // Grab folder name defensively
                  const folderName = token.batchName || token.BatchName;
                  
                  return (
                    <tr key={token.tokenId} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Token ID */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-emberz-cyan text-base tracking-widest">{token.tokenId}</span>
                          <button 
                            onClick={() => handleCopy(token.tokenId)}
                            className="opacity-0 group-hover:opacity-100 transition-all p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg"
                          >
                            {copiedId === token.tokenId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* Batch Name */}
                      <td className="px-8 py-5">
                        <span className={`text-xs font-semibold tracking-wider uppercase ${folderName ? 'text-gray-300' : 'text-gray-600'}`}>
                          {folderName || 'UNASSIGNED'}
                        </span>
                      </td>
                      
                      {/* Guest Name */}
                      <td className="px-8 py-5">
                        {editingTokenId === token.tokenId ? (
                          <div className="relative max-w-xs">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="bg-black/60 border border-emberz-cyan/50 rounded-lg pl-3 pr-10 py-2 text-white text-sm focus:outline-none focus:border-emberz-cyan focus:ring-1 focus:ring-emberz-cyan w-full shadow-inner"
                              placeholder="Enter guest name..."
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveName(token.tokenId)}
                            />
                          </div>
                        ) : (
                          <span className={`text-sm tracking-wide ${token.guestName ? 'text-gray-200 font-medium' : 'text-gray-600 italic'}`}>
                            {token.guestName || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      
                      {/* Status Pill */}
                      <td className="px-8 py-5">
                        {token.checkedIn ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emberz-pink/10 border border-emberz-pink/20 text-emberz-pink text-[0.65rem] font-bold tracking-[0.15em] uppercase shadow-[0_0_10px_rgba(255,0,85,0.1)]">
                            <CheckCircle size={12} /> Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[0.65rem] font-bold tracking-[0.15em] uppercase">
                            Pending
                          </span>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-8 py-5 text-right">
                        {editingTokenId === token.tokenId ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleSaveName(token.tokenId)}
                              disabled={savingName}
                              className="p-2.5 bg-emberz-cyan/10 hover:bg-emberz-cyan/20 border border-emberz-cyan/20 text-emberz-cyan rounded-xl transition-all"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              onClick={() => setEditingTokenId(null)}
                              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingTokenId(token.tokenId);
                              setEditNameValue(token.guestName || '');
                            }}
                            className="p-2.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute top-8 right-8 z-[110]">
            <button 
              onClick={() => {
                setIsScannerOpen(false);
                setScanStatus({ type: 'idle', message: '' });
              }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all border border-white/10"
            >
              <X size={24} />
            </button>
          </div>

          <div className="w-full max-w-md px-4 flex flex-col items-center">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white tracking-widest uppercase flex items-center justify-center gap-3">
                <Scan className="text-emberz-pink" size={32} /> Secure Scan
              </h2>
              <p className="text-gray-400 text-sm mt-2 uppercase tracking-[0.2em]">Align QR code within the frame</p>
            </div>

            <div className="w-full aspect-square rounded-3xl overflow-hidden border-2 border-emberz-pink/50 shadow-[0_0_50px_rgba(255,0,85,0.2)] relative bg-black">
              <QrReader
                onResult={handleScanResult}
                constraints={{ facingMode: 'environment' }}
                containerStyle={{ width: '100%', height: '100%' }}
                videoStyle={{ objectFit: 'cover' }}
              />
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40" />
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emberz-pink/80 shadow-[0_0_10px_#FF0055] animate-[scan_2s_ease-in-out_infinite] pointer-events-none" />
            </div>

            <div className={`mt-8 w-full p-6 rounded-2xl border transition-all duration-300 text-center min-h-[100px] flex items-center justify-center
              ${scanStatus.type === 'idle' ? 'bg-white/5 border-white/10 text-gray-400' : ''}
              ${scanStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : ''}
              ${scanStatus.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : ''}
              ${scanStatus.type === 'error' ? 'bg-emberz-pink/10 border-emberz-pink/50 text-emberz-pink shadow-[0_0_30px_rgba(255,0,85,0.2)]' : ''}
            `}>
              {scanStatus.type === 'idle' && !scanStatus.message ? (
                <span className="uppercase tracking-[0.2em] text-xs font-bold animate-pulse">Waiting for Card Data...</span>
              ) : (
                <span className="font-mono font-bold text-lg">{scanStatus.message}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation for the Scanner Line */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}