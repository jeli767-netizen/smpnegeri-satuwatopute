import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Terminal, 
  FileCode, 
  Key, 
  Settings2, 
  Clock, 
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { Credential, ScriptArg, ScriptItem, ScriptRuntime } from '../types';

interface ScriptModalProps {
  script?: ScriptItem | null;
  credentials: Credential[];
  onSave: (scriptData: Partial<ScriptItem>) => void;
  onClose: () => void;
}

export const ScriptModal: React.FC<ScriptModalProps> = ({
  script,
  credentials,
  onSave,
  onClose,
}) => {
  const isEditing = !!script;

  const [name, setName] = useState(script?.name || '');
  const [description, setDescription] = useState(script?.description || '');
  const [runtime, setRuntime] = useState<ScriptRuntime>(script?.runtime || 'bash');
  const [executablePath, setExecutablePath] = useState(script?.executablePath || './script.sh');
  const [category, setCategory] = useState<ScriptItem['category']>(script?.category || 'DevOps');
  const [workingDir, setWorkingDir] = useState(script?.workingDir || '/workspace');
  const [timeoutSeconds, setTimeoutSeconds] = useState(script ? Math.floor(script.timeoutMs / 1000) : 60);
  const [autoRetry, setAutoRetry] = useState(script?.autoRetry || false);
  const [content, setContent] = useState(
    script?.content || '#!/usr/bin/env bash\necho "Running executable task..."\nexit 0\n'
  );
  const [args, setArgs] = useState<ScriptArg[]>(script?.args || []);
  const [requiredCredentials, setRequiredCredentials] = useState<string[]>(
    script?.requiredCredentials || []
  );

  const handleAddArg = () => {
    setArgs([
      ...args,
      {
        id: `arg-${Date.now()}`,
        key: 'PARAM_NAME',
        defaultValue: '',
        description: 'Argument description',
        required: false,
      },
    ]);
  };

  const handleUpdateArg = (index: number, updates: Partial<ScriptArg>) => {
    const updated = [...args];
    updated[index] = { ...updated[index], ...updates };
    setArgs(updated);
  };

  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const handleToggleCredential = (credId: string) => {
    if (requiredCredentials.includes(credId)) {
      setRequiredCredentials(requiredCredentials.filter(id => id !== credId));
    } else {
      setRequiredCredentials([...requiredCredentials, credId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !executablePath) return;

    onSave({
      name,
      description,
      runtime,
      executablePath,
      category,
      workingDir,
      timeoutMs: timeoutSeconds * 1000,
      autoRetry,
      content,
      args,
      requiredCredentials,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? 'Configure Executable' : 'Register New Executable'}
              </h3>
              <p className="text-xs text-neutral-400">
                Define command line path, runtime environment, script source, and vault bindings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-neutral-300 font-medium mb-1">Executable Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Database Index Optimizer"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="DevOps">DevOps</option>
                <option value="Database">Database</option>
                <option value="Security">Security</option>
                <option value="Build & Deploy">Build & Deploy</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of script responsibilities"
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Runtime & Executable Command */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Runtime</label>
              <select
                value={runtime}
                onChange={(e) => {
                  const newRuntime = e.target.value as ScriptRuntime;
                  setRuntime(newRuntime);
                  if (!isEditing) {
                    if (newRuntime === 'bash') setExecutablePath('bash ./script.sh');
                    if (newRuntime === 'python') setExecutablePath('python3 script.py');
                    if (newRuntime === 'node') setExecutablePath('node script.js');
                    if (newRuntime === 'binary') setExecutablePath('./bin/runner');
                    if (newRuntime === 'sql') setExecutablePath('psql $DATABASE_URL -f query.sql');
                  }
                }}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="bash">Bash / Shell</option>
                <option value="python">Python 3</option>
                <option value="node">Node.js</option>
                <option value="binary">Native Binary (CLI)</option>
                <option value="sql">SQL / Database</option>
                <option value="docker">Docker Container</option>
                <option value="powershell">PowerShell</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-neutral-300 font-medium mb-1">Executable Command Path</label>
              <input
                type="text"
                required
                value={executablePath}
                onChange={(e) => setExecutablePath(e.target.value)}
                placeholder="./scripts/runner.sh"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Working Dir & Timeout & Auto Retry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Working Directory</label>
              <input
                type="text"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                placeholder="/workspace"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Timeout (Seconds)</label>
              <input
                type="number"
                min={5}
                max={600}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={autoRetry}
                  onChange={(e) => setAutoRetry(e.target.checked)}
                  className="rounded border-neutral-800 bg-neutral-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Auto-retry on error</span>
              </label>
            </div>
          </div>

          {/* Script Content / Source Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-300 font-medium">Script Body / Source Code</label>
              <span className="text-[10px] text-neutral-500 font-mono">Simulated execution runtime</span>
            </div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Bound Vault Credentials */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                <span>Inject Encrypted Vault Credentials</span>
              </label>
              <span className="text-[10px] text-neutral-500">Auto-sanitized in log output</span>
            </div>

            {credentials.length === 0 ? (
              <p className="text-neutral-500 text-xs italic">No credentials in vault yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                {credentials.map(c => {
                  const isChecked = requiredCredentials.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCredential(c.id)}
                        className="rounded border-neutral-700 bg-neutral-900 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="truncate">
                        <div className="font-semibold text-[11px] truncate">{c.name}</div>
                        <div className="font-mono text-[10px] text-emerald-400 truncate">{c.key}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic CLI Arguments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-neutral-300 font-medium">Executable Arguments & Flags</label>
              <button
                type="button"
                onClick={handleAddArg}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Argument</span>
              </button>
            </div>

            {args.length === 0 ? (
              <p className="text-neutral-500 text-xs italic">No arguments configured.</p>
            ) : (
              <div className="space-y-2">
                {args.map((arg, idx) => (
                  <div key={arg.id} className="flex items-center gap-2 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <input
                      type="text"
                      placeholder="FLAG_NAME"
                      value={arg.key}
                      onChange={(e) => handleUpdateArg(idx, { key: e.target.value.toUpperCase() })}
                      className="w-32 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-200"
                    />
                    <input
                      type="text"
                      placeholder="Default Value"
                      value={arg.defaultValue}
                      onChange={(e) => handleUpdateArg(idx, { defaultValue: e.target.value })}
                      className="w-36 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-200"
                    />
                    <input
                      type="text"
                      placeholder="Help note / description"
                      value={arg.description}
                      onChange={(e) => handleUpdateArg(idx, { description: e.target.value })}
                      className="flex-1 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-neutral-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArg(idx)}
                      className="text-neutral-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Executable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
