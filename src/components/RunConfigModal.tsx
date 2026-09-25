import React, { useState } from 'react';
import { 
  Play, 
  X, 
  Sliders, 
  Terminal, 
  AlertTriangle, 
  Key, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';
import { Credential, ScriptItem } from '../types';

interface RunConfigModalProps {
  script: ScriptItem;
  credentials: Credential[];
  onLaunch: (customArgs: Record<string, string>, options: { dryRun?: boolean; forceFail?: boolean }) => void;
  onClose: () => void;
}

export const RunConfigModal: React.FC<RunConfigModalProps> = ({
  script,
  credentials,
  onLaunch,
  onClose,
}) => {
  const [customArgs, setCustomArgs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    script.args.forEach(a => {
      initial[a.key] = a.value ?? a.defaultValue;
    });
    return initial;
  });

  const [dryRun, setDryRun] = useState(false);
  const [simulateFail, setSimulateFail] = useState(false);

  const boundCreds = credentials.filter(c => 
    script.requiredCredentials?.includes(c.id) || script.requiredCredentials?.includes(c.key)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunch(customArgs, { dryRun, forceFail: simulateFail });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Execute: {script.name}</h3>
              <p className="text-xs text-neutral-400 font-mono">{script.executablePath}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Arguments */}
          <div>
            <h4 className="font-semibold text-neutral-200 mb-2">Configure Runtime Arguments</h4>
            {script.args.length === 0 ? (
              <p className="text-neutral-500 italic py-2">This executable takes no dynamic flags or arguments.</p>
            ) : (
              <div className="space-y-2.5">
                {script.args.map((arg) => (
                  <div key={arg.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-mono text-emerald-400 font-medium">
                        --{arg.key}
                      </label>
                      <span className="text-[10px] text-neutral-500">{arg.description}</span>
                    </div>
                    <input
                      type="text"
                      value={customArgs[arg.key] ?? ''}
                      onChange={(e) => setCustomArgs({ ...customArgs, [arg.key]: e.target.value })}
                      placeholder={`Default: ${arg.defaultValue}`}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bound Credentials Notice */}
          {boundCreds.length > 0 && (
            <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-lg">
              <div className="flex items-center gap-1.5 text-purple-300 font-medium mb-1">
                <Key className="w-3.5 h-3.5" />
                <span>Vault Credentials Injected ({boundCreds.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {boundCreds.map(c => (
                  <span key={c.id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700/50 text-purple-200">
                    ${c.key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Test & Simulation Toggles */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-900 text-amber-500 focus:ring-amber-500"
              />
              <span className="font-medium">Dry Run Execution</span>
              <span className="text-neutral-500 text-[11px]">(Simulate without mutating external storage)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={simulateFail}
                onChange={(e) => setSimulateFail(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-900 text-rose-500 focus:ring-rose-500"
              />
              <span className="font-medium text-rose-300">Simulate Failure (Exit Code 1)</span>
              <span className="text-neutral-500 text-[11px]">(Test error alert pipeline)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Process</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
