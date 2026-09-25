/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PipelineCanvasView } from './components/PipelineCanvasView';
import { LogTerminalView } from './components/LogTerminalView';
import { VaultView } from './components/VaultView';
import { ScriptModal } from './components/ScriptModal';
import { RunConfigModal } from './components/RunConfigModal';
import { FileImportModal } from './components/FileImportModal';
import { DEFAULT_SCRIPTS, DEFAULT_PIPELINE } from './data/defaultScripts';
import { VaultService } from './services/vault';
import { ExecutionEngine } from './services/runner';
import { Credential, LogEntry, Pipeline, ScriptItem, ScriptStatus } from './types';
import { Terminal, X, ChevronRight, Play, Square, Activity } from 'lucide-react';

const STORAGE_SCRIPTS_KEY = 'execpulse_scripts_v1';
const STORAGE_PIPELINE_KEY = 'execpulse_pipeline_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'terminal' | 'vault'>('dashboard');
  
  // Scripts state
  const [scripts, setScripts] = useState<ScriptItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SCRIPTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading scripts from storage', e);
    }
    return DEFAULT_SCRIPTS;
  });

  // Pipeline state
  const [pipeline, setPipeline] = useState<Pipeline>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PIPELINE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading pipeline from storage', e);
    }
    return DEFAULT_PIPELINE;
  });

  // Credentials state
  const [credentials, setCredentials] = useState<Credential[]>([]);
  
  // Modals
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptItem | null>(null);

  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [activeRunScript, setActiveRunScript] = useState<ScriptItem | null>(null);

  const [isFileImportModalOpen, setIsFileImportModalOpen] = useState(false);

  // Terminal filtering target
  const [terminalFilterScriptId, setTerminalFilterScriptId] = useState<string>('all');

  // Mini floating bottom log ticker
  const [latestLog, setLatestLog] = useState<LogEntry | null>(null);
  const [showMiniTicker, setShowMiniTicker] = useState(true);

  // Pipeline execution controller ref
  const pipelineAbortRef = useRef(false);

  // Initialize vault and credentials
  useEffect(() => {
    VaultService.init().then(() => {
      setCredentials(VaultService.getCredentials());
    });

    // Subscribe to script updates from execution runner
    const unsubscribeScriptUpdates = ExecutionEngine.subscribeScriptUpdates((scriptId, updates) => {
      setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, ...updates } : s));
    });

    // Subscribe to real-time log ticker
    const unsubscribeLogs = ExecutionEngine.subscribeLogs((entry) => {
      setLatestLog(entry);
    });

    return () => {
      unsubscribeScriptUpdates();
      unsubscribeLogs();
    };
  }, []);

  // Save scripts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SCRIPTS_KEY, JSON.stringify(scripts));
    } catch (e) {
      console.error('Error saving scripts', e);
    }
  }, [scripts]);

  // Save pipeline to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PIPELINE_KEY, JSON.stringify(pipeline));
    } catch (e) {
      console.error('Error saving pipeline', e);
    }
  }, [pipeline]);

  const refreshVaultCredentials = () => {
    setCredentials(VaultService.getCredentials());
  };

  // Run a single script
  const handleRunScript = async (
    script: ScriptItem, 
    customArgs?: Record<string, string>, 
    options?: { dryRun?: boolean; forceFail?: boolean }
  ) => {
    setShowMiniTicker(true);
    await ExecutionEngine.executeScript(script, customArgs, options);
  };

  const handleAbortScript = (scriptId: string) => {
    ExecutionEngine.abort(scriptId);
  };

  // Run full pipeline
  const handleExecutePipeline = async () => {
    if (pipeline.steps.length === 0 || pipeline.status === 'running') return;

    pipelineAbortRef.current = false;
    setPipeline(prev => ({
      ...prev,
      status: 'running',
      currentStepIndex: 0,
      lastRunTime: Date.now(),
      steps: prev.steps.map(s => ({ ...s, status: 'idle' })),
    }));

    setShowMiniTicker(true);

    for (let i = 0; i < pipeline.steps.length; i++) {
      if (pipelineAbortRef.current) {
        break;
      }

      const step = pipeline.steps[i];
      const targetScript = scripts.find(s => s.id === step.scriptId);

      setPipeline(prev => ({
        ...prev,
        currentStepIndex: i,
        steps: prev.steps.map((st, idx) => idx === i ? { ...st, status: 'running' } : st),
      }));

      if (!targetScript) {
        setPipeline(prev => ({
          ...prev,
          steps: prev.steps.map((st, idx) => idx === i ? { ...st, status: 'failed', exitCode: 1 } : st),
        }));
        if (!step.continueOnError) {
          setPipeline(prev => ({ ...prev, status: 'failed' }));
          return;
        }
        continue;
      }

      const result = await ExecutionEngine.executeScript(targetScript, step.customArgs);

      if (pipelineAbortRef.current) {
        setPipeline(prev => ({
          ...prev,
          status: 'cancelled',
          steps: prev.steps.map((st, idx) => idx === i ? { ...st, status: 'cancelled' } : st),
        }));
        return;
      }

      setPipeline(prev => ({
        ...prev,
        steps: prev.steps.map((st, idx) => idx === i ? { 
          ...st, 
          status: result.success ? 'success' : 'failed',
          exitCode: result.exitCode,
          durationMs: result.durationMs,
        } : st),
      }));

      if (!result.success && !step.continueOnError) {
        setPipeline(prev => ({ ...prev, status: 'failed' }));
        return;
      }
    }

    setPipeline(prev => ({
      ...prev,
      status: pipelineAbortRef.current ? 'cancelled' : 'success',
      currentStepIndex: -1,
    }));
  };

  const handleAbortPipeline = () => {
    pipelineAbortRef.current = true;
    ExecutionEngine.abortAll();
    setPipeline(prev => ({
      ...prev,
      status: 'cancelled',
      currentStepIndex: -1,
    }));
  };

  // Save new or edited script
  const handleSaveScript = (data: Partial<ScriptItem>) => {
    if (editingScript) {
      setScripts(prev => prev.map(s => s.id === editingScript.id ? { ...s, ...data } as ScriptItem : s));
    } else {
      const newScript: ScriptItem = {
        id: `script-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: data.name || 'Untitled Executable',
        description: data.description || '',
        runtime: data.runtime || 'bash',
        executablePath: data.executablePath || './script.sh',
        content: data.content || '',
        category: data.category || 'Custom',
        args: data.args || [],
        envVars: data.envVars || {},
        requiredCredentials: data.requiredCredentials || [],
        timeoutMs: data.timeoutMs || 60000,
        workingDir: data.workingDir || '/workspace',
        autoRetry: data.autoRetry || false,
        status: 'idle',
        order: scripts.length,
      };
      setScripts(prev => [...prev, newScript]);
    }
    setIsScriptModalOpen(false);
    setEditingScript(null);
  };

  // Duplicate / Clone script
  const handleCloneScript = (script: ScriptItem) => {
    const clone: ScriptItem = {
      ...script,
      id: `script-${Date.now()}`,
      name: `${script.name} (Copy)`,
      status: 'idle',
      pid: undefined,
      lastDurationMs: undefined,
      lastExitCode: undefined,
      order: scripts.length,
    };
    setScripts(prev => [...prev, clone]);
  };

  // Delete script
  const handleDeleteScript = (scriptId: string) => {
    if (confirm('Are you sure you want to delete this script?')) {
      ExecutionEngine.abort(scriptId);
      setScripts(prev => prev.filter(s => s.id !== scriptId));
      // Also remove from pipeline
      setPipeline(prev => ({
        ...prev,
        steps: prev.steps.filter(st => st.scriptId !== scriptId),
      }));
    }
  };

  // File import directly from drag & drop
  const handleDirectFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith('.env')) {
        // Parse .env directly into vault
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim().toUpperCase();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (key && val) {
              await VaultService.addCredential({
                name: `Imported: ${key}`,
                key,
                category: 'secret',
                value: val,
                description: `Imported from ${file.name}`,
                environment: 'global',
              });
            }
          }
        }
        refreshVaultCredentials();
      } else {
        // Create script
        let runtime: ScriptItem['runtime'] = 'bash';
        let execPath = `./${file.name}`;
        if (file.name.endsWith('.py')) {
          runtime = 'python';
          execPath = `python3 ${file.name}`;
        } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
          runtime = 'node';
          execPath = `node ${file.name}`;
        } else if (file.name.endsWith('.sql')) {
          runtime = 'sql';
          execPath = `psql $DATABASE_URL -f ${file.name}`;
        } else if (file.name.endsWith('.exe') || file.name.endsWith('.bin')) {
          runtime = 'binary';
          execPath = `./${file.name}`;
        }

        const newScript: ScriptItem = {
          id: `script-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          description: `Imported script from ${file.name}`,
          runtime,
          executablePath: execPath,
          content: text,
          category: 'Custom',
          args: [],
          envVars: {},
          requiredCredentials: [],
          timeoutMs: 60000,
          workingDir: '/workspace',
          autoRetry: false,
          status: 'idle',
          order: scripts.length,
        };
        setScripts(prev => [...prev, newScript]);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenTerminalForScript = (scriptId: string) => {
    setTerminalFilterScriptId(scriptId);
    setActiveTab('terminal');
  };

  const activeProcessCount = ExecutionEngine.getActiveProcessCount();

  return (
    <div className="min-h-screen bg-[#090a0f] text-neutral-100 flex flex-col font-sans pb-16">
      {/* Engineering Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewScript={() => {
          setEditingScript(null);
          setIsScriptModalOpen(true);
        }}
        onExecutePipeline={handleExecutePipeline}
        onOpenFileImport={() => setIsFileImportModalOpen(true)}
        isPipelineRunning={pipeline.status === 'running'}
      />

      {/* Main View Body */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            scripts={scripts}
            onUpdateScripts={setScripts}
            onRunScript={handleRunScript}
            onAbortScript={handleAbortScript}
            onEditScript={(script) => {
              setEditingScript(script);
              setIsScriptModalOpen(true);
            }}
            onCloneScript={handleCloneScript}
            onDeleteScript={handleDeleteScript}
            onOpenTerminalForScript={handleOpenTerminalForScript}
            onOpenRunModal={(script) => {
              setActiveRunScript(script);
              setIsRunModalOpen(true);
            }}
            onImportFile={handleDirectFileImport}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineCanvasView
            pipeline={pipeline}
            scripts={scripts}
            onUpdatePipeline={setPipeline}
            onExecutePipeline={handleExecutePipeline}
            onAbortPipeline={handleAbortPipeline}
            onOpenTerminal={() => setActiveTab('terminal')}
          />
        )}

        {activeTab === 'terminal' && (
          <LogTerminalView
            scripts={scripts}
            selectedScriptId={terminalFilterScriptId}
            onSelectScriptFilter={setTerminalFilterScriptId}
          />
        )}

        {activeTab === 'vault' && (
          <VaultView
            credentials={credentials}
            scripts={scripts}
            onRefreshCredentials={refreshVaultCredentials}
          />
        )}
      </main>

      {/* Floating Bottom Log Ticker (Visible outside terminal when logs stream) */}
      {showMiniTicker && latestLog && activeTab !== 'terminal' && (
        <div className="fixed bottom-3 right-4 left-4 md:left-auto md:w-[580px] z-30 bg-neutral-900/95 border border-neutral-800 rounded-xl p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeProcessCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-neutral-500'}`} />
            <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-neutral-400 text-[10px] shrink-0 truncate max-w-[100px]">
              [{latestLog.scriptName}]
            </span>
            <span className="font-mono text-neutral-200 text-xs truncate flex-1" title={latestLog.text}>
              {latestLog.text}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setTerminalFilterScriptId(latestLog.scriptId);
                setActiveTab('terminal');
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium transition-colors"
            >
              <span>Console</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowMiniTicker(false)}
              className="p-1 text-neutral-500 hover:text-neutral-300 rounded"
              title="Close ticker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {isScriptModalOpen && (
        <ScriptModal
          script={editingScript}
          credentials={credentials}
          onSave={handleSaveScript}
          onClose={() => {
            setIsScriptModalOpen(false);
            setEditingScript(null);
          }}
        />
      )}

      {isRunModalOpen && activeRunScript && (
        <RunConfigModal
          script={activeRunScript}
          credentials={credentials}
          onLaunch={(customArgs, options) => {
            handleRunScript(activeRunScript, customArgs, options);
          }}
          onClose={() => {
            setIsRunModalOpen(false);
            setActiveRunScript(null);
          }}
        />
      )}

      {isFileImportModalOpen && (
        <FileImportModal
          onImportScript={(scriptData) => {
            handleSaveScript(scriptData);
          }}
          onRefreshVault={refreshVaultCredentials}
          onClose={() => setIsFileImportModalOpen(false)}
        />
      )}
    </div>
  );
}
