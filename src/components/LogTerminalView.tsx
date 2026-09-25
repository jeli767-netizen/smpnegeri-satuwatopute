import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Maximize2, 
  Minimize2, 
  Pause, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock,
  ArrowDown
} from 'lucide-react';
import { LogEntry, LogLevel, ScriptItem } from '../types';
import { ExecutionEngine } from '../services/runner';

interface LogTerminalViewProps {
  scripts: ScriptItem[];
  selectedScriptId?: string;
  onSelectScriptFilter?: (scriptId: string) => void;
}

export const LogTerminalView: React.FC<LogTerminalViewProps> = ({
  scripts,
  selectedScriptId = 'all',
  onSelectScriptFilter,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeFilterScriptId, setActiveFilterScriptId] = useState<string>(selectedScriptId);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync prop changes
  useEffect(() => {
    setActiveFilterScriptId(selectedScriptId);
  }, [selectedScriptId]);

  // Load existing logs and subscribe to incoming real-time logs
  useEffect(() => {
    setLogs(ExecutionEngine.getLogs());

    const unsubscribe = ExecutionEngine.subscribeLogs((newEntry) => {
      setLogs((prev) => [...prev, newEntry]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs based on active criteria
  const filteredLogs = logs.filter((log) => {
    const matchesScript = activeFilterScriptId === 'all' || log.scriptId === activeFilterScriptId;
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch = 
      !searchFilter || 
      log.text.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.scriptName.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesScript && matchesLevel && matchesSearch;
  });

  const handleClearLogs = () => {
    ExecutionEngine.clearLogs(activeFilterScriptId === 'all' ? undefined : activeFilterScriptId);
    setLogs(ExecutionEngine.getLogs());
  };

  const handleCopyLogs = () => {
    const textToCopy = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.scriptName}] ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const textToDownload = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.scriptName}] ${l.text}`)
      .join('\n');
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execpulse-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Color formatter for log levels
  const getLevelStyle = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
      case 'warn':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
      case 'info':
        return 'text-sky-400 bg-sky-950/40 border-sky-800/50';
      case 'system':
        return 'text-purple-400 bg-purple-950/40 border-purple-800/50';
      case 'stderr':
        return 'text-rose-300';
      case 'stdout':
      default:
        return 'text-neutral-300';
    }
  };

  return (
    <div className={`p-4 lg:p-6 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-neutral-950' : 'min-h-[calc(100vh-100px)]'}`}>
      {/* Terminal Controls Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-t-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Window decorations & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>

          <div className="flex items-center gap-2 font-mono text-neutral-300">
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">Live Execution Terminal</span>
            <span className="text-neutral-500">|</span>
            <span className="text-[11px] text-neutral-400">
              {filteredLogs.length} events streamed
            </span>
          </div>
        </div>

        {/* Middle: Script selector & Level filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Script selector */}
          <select
            value={activeFilterScriptId}
            onChange={(e) => {
              setActiveFilterScriptId(e.target.value);
              onSelectScriptFilter?.(e.target.value);
            }}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Executables (Global Stream)</option>
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Levels</option>
            <option value="stdout">Stdout</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="system">System</option>
          </select>

          {/* Search grep */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Grep logs..."
              className="pl-8 pr-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-36 lg:w-48"
            />
          </div>
        </div>

        {/* Right: Autoscroll, Clear, Copy, Export, Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
              autoScroll
                ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is PAUSED'}
          >
            {autoScroll ? <ArrowDown className="w-3 h-3 text-emerald-400 animate-bounce" /> : <Pause className="w-3 h-3" />}
            <span className="hidden sm:inline">{autoScroll ? 'Auto-scroll' : 'Paused'}</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownloadLogs}
            className="p-1.5 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Download .log file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors"
            title="Clear console output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Main Body */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#05070c] border-x border-b border-neutral-800 rounded-b-xl p-4 font-mono text-xs overflow-y-auto min-h-[480px] max-h-[calc(100vh-220px)] selection:bg-emerald-500/20"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 text-neutral-600">
            <TerminalIcon className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium text-neutral-400">Terminal console is currently empty</p>
            <p className="text-xs text-neutral-600 max-w-sm mt-1">
              Execute any script or pipeline from the dashboard to observe real-time standard output, error streams, and exit codes.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => {
              const style = getLevelStyle(log.level);
              return (
                <div 
                  key={log.id} 
                  className="flex items-start gap-2.5 py-0.5 hover:bg-neutral-900/60 rounded px-1.5 transition-colors group leading-relaxed"
                >
                  {/* Line index */}
                  <span className="select-none text-neutral-600 text-[10px] w-8 text-right shrink-0 pt-0.5 font-mono">
                    {index + 1}
                  </span>

                  {/* Millisecond Timestamp */}
                  <span className="select-none text-neutral-500 text-[11px] shrink-0 pt-0.5 font-mono">
                    {log.timestamp}
                  </span>

                  {/* Script Tag if in global view */}
                  {activeFilterScriptId === 'all' && (
                    <span className="select-none text-neutral-400 bg-neutral-900 border border-neutral-800 text-[10px] px-1.5 py-0.2 rounded shrink-0 max-w-[140px] truncate" title={log.scriptName}>
                      {log.scriptName}
                    </span>
                  )}

                  {/* Level Tag */}
                  <span className={`select-none uppercase text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${style}`}>
                    {log.level}
                  </span>

                  {/* Log Content */}
                  <span className={`flex-1 break-all whitespace-pre-wrap ${style}`}>
                    {log.text}
                  </span>
                </div>
              );
            })}

            {/* Prompt Line with Blinking Cursor */}
            <div className="flex items-center gap-2 pt-3 text-neutral-500 text-xs">
              <span className="text-emerald-500 font-bold">$</span>
              <span>listening on IPC stream...</span>
              <span className="terminal-cursor"></span>
            </div>

            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
