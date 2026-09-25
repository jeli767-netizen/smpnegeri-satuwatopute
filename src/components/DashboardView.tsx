import React, { useState, useRef } from 'react';
import { 
  Play, 
  Square, 
  Terminal, 
  Settings2, 
  MoreVertical, 
  GripVertical, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  Search, 
  Filter, 
  UploadCloud, 
  Copy, 
  Trash2, 
  Edit3, 
  Key, 
  ChevronDown,
  Sparkles,
  Zap,
  SlidersHorizontal,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { ScriptItem, ScriptRuntime, ScriptStatus } from '../types';
import { ExecutionEngine } from '../services/runner';

interface DashboardViewProps {
  scripts: ScriptItem[];
  onUpdateScripts: (scripts: ScriptItem[]) => void;
  onRunScript: (script: ScriptItem, customArgs?: Record<string, string>, options?: { dryRun?: boolean }) => void;
  onAbortScript: (scriptId: string) => void;
  onEditScript: (script: ScriptItem) => void;
  onCloneScript: (script: ScriptItem) => void;
  onDeleteScript: (scriptId: string) => void;
  onOpenTerminalForScript: (scriptId: string) => void;
  onOpenRunModal: (script: ScriptItem) => void;
  onImportFile: (file: File) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  scripts,
  onUpdateScripts,
  onRunScript,
  onAbortScript,
  onEditScript,
  onCloneScript,
  onDeleteScript,
  onOpenTerminalForScript,
  onOpenRunModal,
  onImportFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuntime, setSelectedRuntime] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [draggedScriptId, setDraggedScriptId] = useState<string | null>(null);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
  const [menuOpenScriptId, setMenuOpenScriptId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Runtime badge helper
  const getRuntimeBadge = (runtime: ScriptRuntime) => {
    switch (runtime) {
      case 'bash':
        return { label: 'Bash', bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'python':
        return { label: 'Python 3', bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'node':
        return { label: 'Node.js', bg: 'bg-green-950/60', text: 'text-green-400', border: 'border-green-500/30' };
      case 'binary':
        return { label: 'Native Binary', bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-500/30' };
      case 'sql':
        return { label: 'PostgreSQL', bg: 'bg-sky-950/60', text: 'text-sky-400', border: 'border-sky-500/30' };
      case 'docker':
        return { label: 'Docker Container', bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-500/30' };
      case 'powershell':
        return { label: 'PowerShell', bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-500/30' };
      default:
        return { label: runtime, bg: 'bg-neutral-800', text: 'text-neutral-300', border: 'border-neutral-700' };
    }
  };

  // Status renderer
  const renderStatus = (script: ScriptItem) => {
    if (script.status === 'running') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Running (PID {script.pid})</span>
        </span>
      );
    }
    if (script.status === 'success') {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Exit 0 ({((script.lastDurationMs || 0) / 1000).toFixed(1)}s)</span>
        </span>
      );
    }
    if (script.status === 'failed') {
      return (
        <span className="flex items-center gap-1 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Exit {script.lastExitCode ?? 1}</span>
        </span>
      );
    }
    if (script.status === 'cancelled') {
      return (
        <span className="flex items-center gap-1 text-xs text-neutral-400">
          <Square className="w-3.5 h-3.5 text-neutral-500" />
          <span>Aborted</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-neutral-500">
        <Clock className="w-3 h-3" />
        <span>Idle</span>
      </span>
    );
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedScriptId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnScript = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = scripts.findIndex(s => s.id === sourceId);
    const targetIndex = scripts.findIndex(s => s.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const updated = [...scripts];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-index orders
    const reindexed = updated.map((item, idx) => ({ ...item, order: idx }));
    onUpdateScripts(reindexed);
    setDraggedScriptId(null);
  };

  // File drag & drop onto canvas
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFileOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onImportFile(e.dataTransfer.files[i]);
      }
    }
  };

  const filteredScripts = scripts.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.executablePath.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRuntime = selectedRuntime === 'all' || s.runtime === selectedRuntime;
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesRuntime && matchesCategory;
  });

  const categories = ['all', 'DevOps', 'Database', 'Security', 'Build & Deploy', 'Maintenance', 'Custom'];
  const runtimes: { id: string; label: string }[] = [
    { id: 'all', label: 'All Runtimes' },
    { id: 'bash', label: 'Bash' },
    { id: 'python', label: 'Python' },
    { id: 'node', label: 'Node.js' },
    { id: 'binary', label: 'Binary' },
    { id: 'sql', label: 'SQL' },
    { id: 'docker', label: 'Docker' },
  ];

  return (
    <div 
      className={`min-h-[calc(100vh-100px)] p-4 lg:p-6 transition-colors ${
        isDraggingFileOver ? 'bg-emerald-950/20 ring-2 ring-emerald-500/50' : ''
      }`}
      onDragOver={(e) => {
        // If files are being dragged from desktop
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingFileOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingFileOver(false);
        }
      }}
      onDrop={handleFileDrop}
    >
      {/* File Drop Banner if dragging */}
      {isDraggingFileOver && (
        <div className="mb-6 p-8 border-2 border-dashed border-emerald-500/70 bg-emerald-950/40 rounded-xl flex flex-col items-center justify-center text-center animate-pulse">
          <UploadCloud className="w-12 h-12 text-emerald-400 mb-2" />
          <h3 className="text-base font-semibold text-emerald-200">Drop script files to import directly!</h3>
          <p className="text-xs text-emerald-400/80">Supports .sh, .py, .js, .sql, .exe, .bat, .json, and .env files</p>
        </div>
      )}

      {/* Top Filter and Search Bar */}
      <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search executables, paths, flags..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Runtime filter */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {runtimes.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRuntime(r.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedRuntime === r.id
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Category filter dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  Category: {c === 'all' ? 'All' : c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach(f => onImportFile(f));
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-neutral-400" />
            <span>Drop / Import File</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Bar */}
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-2">
          <span>{filteredScripts.length} Executables Configured</span>
          <span>·</span>
          <span>Drag cards by the handle <span className="text-neutral-500">⠿</span> to reorder priority</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              filteredScripts.forEach(s => {
                if (s.status !== 'running') {
                  onRunScript(s);
                }
              });
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Batch Run Visible ({filteredScripts.length})</span>
          </button>
        </div>
      </div>

      {/* Grid of Executable Script Cards */}
      {filteredScripts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
          <FileCode className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300 mb-1">No executables match your criteria</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
            Try adjusting your search terms or filters, or drag and drop a script file to create a new runner card.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRuntime('all');
              setSelectedCategory('all');
            }}
            className="text-xs text-emerald-400 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredScripts.map((script) => {
            const runtimeBadge = getRuntimeBadge(script.runtime);
            const isRunning = script.status === 'running';

            return (
              <div
                key={script.id}
                draggable
                onDragStart={(e) => handleDragStart(e, script.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnScript(e, script.id)}
                className={`relative flex flex-col justify-between bg-neutral-900/90 border rounded-xl p-4 transition-all duration-200 group ${
                  isRunning
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                    : 'border-neutral-800 hover:border-neutral-700 hover:shadow-md hover:shadow-black/50'
                } ${draggedScriptId === script.id ? 'opacity-40 scale-[0.98]' : 'opacity-100'}`}
              >
                {/* Top Row: Drag Handle, Runtime badge, Category, and Action Menu */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div 
                        className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-300 transition-colors p-0.5"
                        title="Drag to reorder card"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${runtimeBadge.bg} ${runtimeBadge.text} ${runtimeBadge.border}`}>
                        {runtimeBadge.label}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {script.category}
                      </span>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenScriptId(menuOpenScriptId === script.id ? null : script.id)}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpenScriptId === script.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 z-30 text-xs"
                          onMouseLeave={() => setMenuOpenScriptId(null)}
                        >
                          <button
                            onClick={() => {
                              onEditScript(script);
                              setMenuOpenScriptId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Edit Script</span>
                          </button>
                          <button
                            onClick={() => {
                              onOpenRunModal(script);
                              setMenuOpenScriptId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Configure Args...</span>
                          </button>
                          <button
                            onClick={() => {
                              onCloneScript(script);
                              setMenuOpenScriptId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => {
                              onOpenTerminalForScript(script.id);
                              setMenuOpenScriptId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
                          >
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span>Stream Live Logs</span>
                          </button>
                          <div className="border-t border-neutral-800 my-1" />
                          <button
                            onClick={() => {
                              onDeleteScript(script.id);
                              setMenuOpenScriptId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Script</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-sm text-neutral-100 group-hover:text-emerald-300 transition-colors mb-1 line-clamp-1">
                    {script.name}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
                    {script.description}
                  </p>

                  {/* Executable Path Command Line preview */}
                  <div className="mb-3 px-2.5 py-1.5 bg-neutral-950/90 border border-neutral-800/80 rounded-md font-mono text-[11px] text-neutral-300 flex items-center justify-between gap-2 overflow-hidden">
                    <span className="text-emerald-500 font-bold">$</span>
                    <span className="truncate flex-1 text-neutral-300" title={script.executablePath}>
                      {script.executablePath}
                    </span>
                  </div>

                  {/* Attached Vault Credentials Badges */}
                  {script.requiredCredentials && script.requiredCredentials.length > 0 && (
                    <div className="mb-3 flex items-center gap-1.5 text-[11px] text-purple-300/90">
                      <Key className="w-3 h-3 text-purple-400" />
                      <span>{script.requiredCredentials.length} Vault Credential(s) bound</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Status, Timers, Run / Abort Control */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <div>
                    {renderStatus(script)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Logs shortcut */}
                    <button
                      onClick={() => onOpenTerminalForScript(script.id)}
                      className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      title="Open Terminal Stream"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>

                    {/* Run / Stop action button */}
                    {isRunning ? (
                      <button
                        onClick={() => onAbortScript(script.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Abort</span>
                      </button>
                    ) : (
                      <div className="flex items-center">
                        <button
                          onClick={() => onRunScript(script)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-l-lg font-medium text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run</span>
                        </button>
                        <button
                          onClick={() => onOpenRunModal(script)}
                          className="px-1.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-r-lg border-l border-emerald-800 transition-colors"
                          title="Run with custom flags or dry-run"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
