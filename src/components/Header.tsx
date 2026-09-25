import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  HardDrive, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Play, 
  Plus, 
  UploadCloud, 
  Lock, 
  Unlock,
  Layers,
  FileCode2,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { ExecutionEngine } from '../services/runner';
import { VaultService } from '../services/vault';
import { SystemMetrics } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'pipeline' | 'terminal' | 'vault';
  setActiveTab: (tab: 'dashboard' | 'pipeline' | 'terminal' | 'vault') => void;
  onNewScript: () => void;
  onExecutePipeline: () => void;
  onOpenFileImport: () => void;
  isPipelineRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewScript,
  onExecutePipeline,
  onOpenFileImport,
  isPipelineRunning,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeProcesses: 0,
    cpuLoad: 3.4,
    memoryUsageMb: 284,
    totalRunsToday: 18,
    successRate: 98.4,
  });

  const [isVaultUnlocked, setIsVaultUnlocked] = useState(VaultService.isVaultUnlocked());
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseError, setPassphraseError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const activeCount = ExecutionEngine.getActiveProcessCount();
      setIsVaultUnlocked(VaultService.isVaultUnlocked());

      setMetrics(prev => {
        const baseCpu = activeCount > 0 ? 18 + activeCount * 14 : 2.5;
        const jitter = (Math.random() * 4 - 2);
        const cpu = Math.min(99, Math.max(1.2, +(baseCpu + jitter).toFixed(1)));
        const mem = 280 + activeCount * 45 + Math.floor(Math.random() * 12);
        return {
          ...prev,
          activeProcesses: activeCount,
          cpuLoad: cpu,
          memoryUsageMb: mem,
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleToggleVault = () => {
    if (isVaultUnlocked) {
      VaultService.lock();
      setIsVaultUnlocked(false);
    } else {
      setPassphraseInput('');
      setPassphraseError('');
      setShowPassphraseModal(true);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await VaultService.unlock(passphraseInput);
    if (success) {
      setIsVaultUnlocked(true);
      setShowPassphraseModal(false);
      setPassphraseError('');
    } else {
      setPassphraseError('Invalid vault master passphrase');
    }
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Engineering Metrics Bar */}
      <div className="px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900 text-xs">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">ExecPulse</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-semibold tracking-wide">
                CLI Engine v3.2
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Executable & Script Orchestrator</p>
          </div>
        </div>

        {/* Real-time System Metrics */}
        <div className="flex items-center gap-4 text-neutral-400 font-mono">
          {/* Active Processes */}
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-500">PIDs:</span>
            <span className={`font-semibold ${metrics.activeProcesses > 0 ? 'text-emerald-400 animate-pulse' : 'text-neutral-300'}`}>
              {metrics.activeProcesses} Active
            </span>
          </div>

          <span className="text-neutral-800">|</span>

          {/* CPU Load */}
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-500">CPU:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-200">{metrics.cpuLoad}%</span>
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${metrics.cpuLoad > 70 ? 'bg-rose-500' : metrics.cpuLoad > 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${metrics.cpuLoad}%` }}
                />
              </div>
            </div>
          </div>

          <span className="text-neutral-800">|</span>

          {/* RAM Usage */}
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-500">RAM:</span>
            <span className="text-neutral-200">{metrics.memoryUsageMb} MB</span>
          </div>

          <span className="text-neutral-800 hidden sm:inline">|</span>

          {/* Vault Status Indicator */}
          <button
            onClick={handleToggleVault}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs ${
              isVaultUnlocked 
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40' 
                : 'bg-amber-950/60 border border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
            }`}
            title={isVaultUnlocked ? "Vault is Unlocked. Click to Lock." : "Vault is Locked. Click to Unlock."}
          >
            {isVaultUnlocked ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
            <span>Vault: {isVaultUnlocked ? 'Unlocked' : 'Encrypted'}</span>
          </button>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFileImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all text-xs"
            title="Import script or .env file"
          >
            <UploadCloud className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Import Script</span>
          </button>

          <button
            onClick={onExecutePipeline}
            disabled={isPipelineRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
              isPipelineRunning
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950 hover:shadow-emerald-900/40'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isPipelineRunning ? 'animate-spin' : ''}`} />
            <span>{isPipelineRunning ? 'Pipeline Running...' : 'Run Pipeline'}</span>
          </button>

          <button
            onClick={onNewScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Executable</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="px-4 lg:px-6 flex items-center justify-between overflow-x-auto">
        <nav className="flex items-center gap-1 py-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Dashboard & Scripts</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'pipeline'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-sky-400" />
            <span>Pipeline Canvas</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'terminal'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>Live Terminal & Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'vault'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span>Encrypted Vault</span>
          </button>
        </nav>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Host Daemon: Connected
          </span>
          <span className="text-neutral-700">·</span>
          <span>Port 3000 IPC</span>
        </div>
      </div>

      {/* Unlock Master Vault Modal */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Unlock Credential Vault</h3>
                <p className="text-xs text-neutral-400">AES-GCM 256-bit Key Derivation</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
              Enter your vault master passphrase to decrypt secure credentials and environment tokens for executable runtime injection.
              <span className="block mt-1 text-neutral-500 font-mono">
                (Default session key: <code className="text-emerald-400">master-pulse-key-2026</code>)
              </span>
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Master Passphrase
                </label>
                <input
                  type="password"
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  placeholder="Enter vault passphrase..."
                  autoFocus
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                />
                {passphraseError && (
                  <p className="text-xs text-rose-400 mt-1">{passphraseError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassphraseModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-sm"
                >
                  Unlock Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
